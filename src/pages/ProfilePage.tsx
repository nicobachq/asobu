import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SkillRadarChart from '../components/SkillRadarChart';
import {
  buildRoleSelectionMap,
  formatPersonRoleLabel,
  formatRoleSummary,
  getIdentityContextLabel,
  getOpenToLabelsForRoles,
  getUniquePersonRoles,
  ORGANIZATION_REGISTRATION_OPTIONS,
  PERSON_ROLE_OPTIONS,
  type OrganizationRegistrationType,
  type PersonRole,
} from '../lib/identity';
import {
  buildDefaultSkillRatings,
  mergeSkillEntriesWithTemplate,
  resolveSkillTemplate,
  type SkillEntryValue,
} from '../lib/skills';
import { getPrimarySportLabelFromValue, SPORT_REGISTRATION_OPTIONS } from '../lib/sports';
import { supabase } from '../lib/supabase';

type Profile = {
  id: string;
  full_name: string | null;
  role: string | null;
  location: string | null;
  main_sport: string | null;
  created_at: string | null;
};

type Organization = {
  id: number;
  name: string;
  organization_type: string;
  sport: string | null;
  location: string | null;
  description: string | null;
  created_by: string;
  created_at: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
};

type OrganizationMembershipRow = {
  id: number;
  organization_id: number;
  user_id: string;
  member_role: string | null;
  created_at: string | null;
  organizations: Organization | Organization[] | null;
};

type OrganizationWithRole = Organization & {
  member_role: string;
};

type ProfileRoleRow = {
  id: number;
  user_id: string;
  role: string;
  sport: string | null;
  is_primary: boolean;
  created_at: string | null;
};

type RoleSelectionState = Record<PersonRole, boolean>;

type SportingHistoryEntry = {
  id: number;
  user_id: string;
  sport: string | null;
  organization_name: string;
  organization_type: string | null;
  role_label: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  summary: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ProfileSkillEntry = {
  id: number;
  user_id: string;
  sport: string;
  skill_key: string;
  self_rating: number;
  created_at: string | null;
  updated_at: string | null;
};

type ProfileSkillValidation = {
  id: number;
  skill_entry_id: number;
  validator_user_id: string;
  created_at: string | null;
};

type HistoryFormState = {
  organizationName: string;
  organizationType: string;
  roleLabel: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  summary: string;
};

const EMPTY_HISTORY_FORM: HistoryFormState = {
  organizationName: '',
  organizationType: 'team',
  roleLabel: '',
  location: '',
  startDate: '',
  endDate: '',
  isCurrent: false,
  summary: '',
};

function getInitials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'A'
  );
}

function formatHistoryPeriod(entry: SportingHistoryEntry) {
  if (entry.is_current && entry.start_date) {
    return `${new Date(entry.start_date).toLocaleDateString()} → Present`;
  }

  if (entry.start_date && entry.end_date) {
    return `${new Date(entry.start_date).toLocaleDateString()} → ${new Date(entry.end_date).toLocaleDateString()}`;
  }

  if (entry.start_date) {
    return `${new Date(entry.start_date).toLocaleDateString()} →`;
  }

  if (entry.end_date) {
    return `Until ${new Date(entry.end_date).toLocaleDateString()}`;
  }

  return 'Period not specified';
}

function ProfilePage() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([]);

  const [fullName, setFullName] = useState('');
  const [location, setLocation] = useState('');
  const [mainSport, setMainSport] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<RoleSelectionState>(
    buildRoleSelectionMap(['player'])
  );
  const [primaryRole, setPrimaryRole] = useState<PersonRole>('player');

  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState<OrganizationRegistrationType>('team');
  const [orgSport, setOrgSport] = useState('');
  const [orgLocation, setOrgLocation] = useState('');
  const [orgDescription, setOrgDescription] = useState('');

  const [historyEntries, setHistoryEntries] = useState<SportingHistoryEntry[]>([]);
  const [historyForm, setHistoryForm] = useState<HistoryFormState>(EMPTY_HISTORY_FORM);
  const [editingHistoryId, setEditingHistoryId] = useState<number | null>(null);
  const [historyAvailable, setHistoryAvailable] = useState(true);
  const [savingHistory, setSavingHistory] = useState(false);
  const [historyMessage, setHistoryMessage] = useState('');

  const [skillEntries, setSkillEntries] = useState<ProfileSkillEntry[]>([]);
  const [skillRatings, setSkillRatings] = useState<Record<string, number>>({});
  const [skillValidationCounts, setSkillValidationCounts] = useState<Record<string, number>>({});
  const [skillsAvailable, setSkillsAvailable] = useState(true);
  const [savingSkills, setSavingSkills] = useState(false);
  const [skillMessage, setSkillMessage] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [message, setMessage] = useState('');
  const [orgMessage, setOrgMessage] = useState('');

  const selectedRoleValues = useMemo(
    () =>
      PERSON_ROLE_OPTIONS.filter((option) => selectedRoles[option.value]).map(
        (option) => option.value
      ),
    [selectedRoles]
  );

  const activeSportValue = profile?.main_sport || mainSport;
  const activeSkillTemplate = useMemo(
    () => resolveSkillTemplate(activeSportValue),
    [activeSportValue]
  );

  const mergedSkillCards = useMemo(
    () => mergeSkillEntriesWithTemplate(activeSkillTemplate, skillEntries as SkillEntryValue[]),
    [activeSkillTemplate, skillEntries]
  );

  const radarPoints = useMemo(
    () =>
      mergedSkillCards.map((skill) => ({
        label: skill.label,
        shortLabel: skill.shortLabel,
        value: skill.selfRating,
      })),
    [mergedSkillCards]
  );

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setProfileId(user.id);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error.message);
      } else {
        const typedProfile = data as Profile;
        setProfile(typedProfile);
        setFullName(typedProfile.full_name || '');
        setLocation(typedProfile.location || '');
        setMainSport(typedProfile.main_sport || '');
        await loadProfileRoles(user.id, typedProfile);
      }

      await Promise.all([loadOrganizations(user.id), loadSportingHistory(user.id)]);
      setLoading(false);
    }

    loadProfile();
  }, []);

  useEffect(() => {
    async function loadSkillsForCurrentTemplate() {
      if (!profileId) return;
      await loadProfileSkills(profileId, activeSkillTemplate.key);
    }

    loadSkillsForCurrentTemplate();
  }, [profileId, activeSkillTemplate.key]);

  async function loadProfileRoles(userId: string, currentProfile: Profile) {
    const { data, error } = await supabase
      .from('profile_roles')
      .select('id, user_id, role, sport, is_primary, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('profile_roles unavailable, falling back to profile.role:', error.message);
      const fallbackPrimary = getUniquePersonRoles([currentProfile.role])[0] || 'player';
      setSelectedRoles(buildRoleSelectionMap([fallbackPrimary]));
      setPrimaryRole(fallbackPrimary);
      return;
    }

    const typedRoles = (data as ProfileRoleRow[]) || [];
    const normalizedRoles =
      typedRoles.length > 0
        ? getUniquePersonRoles(typedRoles.map((item) => item.role))
        : getUniquePersonRoles([currentProfile.role]);

    const safeRoles: PersonRole[] = normalizedRoles.length > 0 ? normalizedRoles : ['player'];
    const primaryFromTable = typedRoles.find((item) => item.is_primary)?.role || currentProfile.role;
    const safePrimary = getUniquePersonRoles([primaryFromTable])[0] || safeRoles[0];

    setSelectedRoles(buildRoleSelectionMap(safeRoles));
    setPrimaryRole(safePrimary);
  }

  async function loadOrganizations(userId: string) {
    const { data, error } = await supabase
      .from('organization_members')
      .select(
        'id, organization_id, user_id, member_role, created_at, organizations(id, name, organization_type, sport, location, description, created_by, created_at, logo_url, cover_image_url)'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading organizations:', error.message);
      return;
    }

    const mapped: OrganizationWithRole[] = ((data as OrganizationMembershipRow[]) || [])
      .map((item) => {
        const organization = Array.isArray(item.organizations)
          ? item.organizations[0]
          : item.organizations;

        if (!organization) {
          return null;
        }

        return {
          ...organization,
          member_role: item.member_role || 'member',
        };
      })
      .filter(Boolean) as OrganizationWithRole[];

    setOrganizations(mapped);
  }

  async function loadSportingHistory(userId: string) {
    const { data, error } = await supabase
      .from('sporting_history_entries')
      .select('*')
      .eq('user_id', userId)
      .order('is_current', { ascending: false })
      .order('start_date', { ascending: false, nullsFirst: false });

    if (error) {
      console.warn('sporting_history_entries unavailable:', error.message);
      setHistoryAvailable(false);
      setHistoryEntries([]);
      return;
    }

    setHistoryAvailable(true);
    setHistoryEntries((data as SportingHistoryEntry[]) || []);
  }

  async function loadProfileSkills(userId: string, sportKey: string) {
    const { data, error } = await supabase
      .from('profile_skill_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('sport', sportKey)
      .order('skill_key', { ascending: true });

    if (error) {
      console.warn('profile_skill_entries unavailable:', error.message);
      setSkillsAvailable(false);
      setSkillEntries([]);
      setSkillRatings(
        Object.fromEntries(buildDefaultSkillRatings(activeSkillTemplate).map((entry) => [entry.skill_key, entry.self_rating]))
      );
      setSkillValidationCounts({});
      return;
    }

    const typedEntries = (data as ProfileSkillEntry[]) || [];
    setSkillsAvailable(true);
    setSkillEntries(typedEntries);
    setSkillRatings(
      Object.fromEntries(
        mergeSkillEntriesWithTemplate(activeSkillTemplate, typedEntries).map((entry) => [
          entry.key,
          entry.selfRating,
        ])
      )
    );

    if (typedEntries.length === 0) {
      setSkillValidationCounts({});
      return;
    }

    const { data: validationData, error: validationError } = await supabase
      .from('profile_skill_validations')
      .select('id, skill_entry_id, validator_user_id, created_at')
      .in(
        'skill_entry_id',
        typedEntries.map((entry) => entry.id)
      );

    if (validationError) {
      console.warn('profile_skill_validations unavailable:', validationError.message);
      setSkillValidationCounts({});
      return;
    }

    const validations = (validationData as ProfileSkillValidation[]) || [];
    const entryMap = new Map(typedEntries.map((entry) => [entry.id, entry.skill_key]));
    const counts: Record<string, number> = {};

    for (const validation of validations) {
      const skillKey = entryMap.get(validation.skill_entry_id);
      if (!skillKey) continue;
      counts[skillKey] = (counts[skillKey] || 0) + 1;
    }

    setSkillValidationCounts(counts);
  }

  function handleRoleToggle(role: PersonRole) {
    setSelectedRoles((current) => {
      const next = {
        ...current,
        [role]: !current[role],
      };

      const stillSelected = PERSON_ROLE_OPTIONS.some((option) => next[option.value]);

      if (!stillSelected) {
        next.player = true;
      }

      const nextSelectedRoles = PERSON_ROLE_OPTIONS.filter((option) => next[option.value]).map(
        (option) => option.value
      );

      if (!nextSelectedRoles.includes(primaryRole)) {
        setPrimaryRole(nextSelectedRoles[0]);
      }

      return next;
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!profileId || selectedRoleValues.length === 0) return;

    setSaving(true);
    setMessage('');

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        role: primaryRole,
        location,
        main_sport: mainSport,
      })
      .eq('id', profileId);

    if (error) {
      setMessage(`Error: ${error.message}`);
      setSaving(false);
      return;
    }

    const { error: deleteRolesError } = await supabase
      .from('profile_roles')
      .delete()
      .eq('user_id', profileId);

    if (deleteRolesError) {
      console.warn('Could not replace profile_roles:', deleteRolesError.message);
    } else {
      const roleRows = selectedRoleValues.map((role) => ({
        user_id: profileId,
        role,
        sport: mainSport.trim() || null,
        is_primary: role === primaryRole,
      }));

      const { error: insertRolesError } = await supabase.from('profile_roles').insert(roleRows);

      if (insertRolesError) {
        console.warn('Could not save profile_roles:', insertRolesError.message);
      }
    }

    setProfile((prev) =>
      prev
        ? {
            ...prev,
            full_name: fullName,
            role: primaryRole,
            location,
            main_sport: mainSport,
          }
        : prev
    );
    setMessage('Profile updated successfully.');
    setSaving(false);
  }

  async function handleCreateOrganization(e: React.FormEvent) {
    e.preventDefault();

    if (!profileId || !orgName.trim()) return;

    setCreatingOrg(true);
    setOrgMessage('');

    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: orgName.trim(),
        organization_type: orgType,
        sport: orgSport.trim() || null,
        location: orgLocation.trim() || null,
        description: orgDescription.trim() || null,
        created_by: profileId,
      })
      .select()
      .single();

    if (orgError) {
      setOrgMessage(`Error: ${orgError.message}`);
      setCreatingOrg(false);
      return;
    }

    const { error: memberError } = await supabase.from('organization_members').insert({
      organization_id: orgData.id,
      user_id: profileId,
      member_role: 'owner',
    });

    if (memberError) {
      setOrgMessage(`Error: ${memberError.message}`);
      setCreatingOrg(false);
      return;
    }

    setOrgName('');
    setOrgType('team');
    setOrgSport('');
    setOrgLocation('');
    setOrgDescription('');
    setOrgMessage('Organization created successfully.');

    await loadOrganizations(profileId);
    setCreatingOrg(false);
  }

  function populateHistoryForm(entry: SportingHistoryEntry) {
    setEditingHistoryId(entry.id);
    setHistoryForm({
      organizationName: entry.organization_name,
      organizationType: entry.organization_type || 'team',
      roleLabel: entry.role_label || '',
      location: entry.location || '',
      startDate: entry.start_date || '',
      endDate: entry.end_date || '',
      isCurrent: entry.is_current,
      summary: entry.summary || '',
    });
  }

  function resetHistoryForm() {
    setEditingHistoryId(null);
    setHistoryForm(EMPTY_HISTORY_FORM);
    setHistoryMessage('');
  }

  async function handleSaveHistory(e: React.FormEvent) {
    e.preventDefault();

    if (!profileId || !historyForm.organizationName.trim()) return;

    setSavingHistory(true);
    setHistoryMessage('');

    const payload = {
      user_id: profileId,
      sport: (profile?.main_sport || mainSport || '').trim() || null,
      organization_name: historyForm.organizationName.trim(),
      organization_type: historyForm.organizationType.trim() || null,
      role_label: historyForm.roleLabel.trim() || null,
      location: historyForm.location.trim() || null,
      start_date: historyForm.startDate || null,
      end_date: historyForm.isCurrent ? null : historyForm.endDate || null,
      is_current: historyForm.isCurrent,
      summary: historyForm.summary.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const query = editingHistoryId
      ? supabase.from('sporting_history_entries').update(payload).eq('id', editingHistoryId).eq('user_id', profileId)
      : supabase.from('sporting_history_entries').insert(payload);

    const { error } = await query;

    if (error) {
      setHistoryMessage(`Error: ${error.message}`);
      setSavingHistory(false);
      return;
    }

    await loadSportingHistory(profileId);
    setHistoryMessage(editingHistoryId ? 'History entry updated.' : 'History entry added.');
    setSavingHistory(false);
    resetHistoryForm();
  }

  async function handleDeleteHistory(entryId: number) {
    if (!profileId) return;

    const { error } = await supabase
      .from('sporting_history_entries')
      .delete()
      .eq('id', entryId)
      .eq('user_id', profileId);

    if (error) {
      setHistoryMessage(`Error: ${error.message}`);
      return;
    }

    await loadSportingHistory(profileId);
    setHistoryMessage('History entry removed.');
    if (editingHistoryId === entryId) {
      resetHistoryForm();
    }
  }

  async function handleSaveSkills() {
    if (!profileId) return;

    setSavingSkills(true);
    setSkillMessage('');

    const rows = activeSkillTemplate.skills.map((skill) => ({
      user_id: profileId,
      sport: activeSkillTemplate.key,
      skill_key: skill.key,
      self_rating: Math.round(skillRatings[skill.key] ?? 60),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('profile_skill_entries')
      .upsert(rows, { onConflict: 'user_id,sport,skill_key' });

    if (error) {
      setSkillMessage(`Error: ${error.message}`);
      setSavingSkills(false);
      return;
    }

    await loadProfileSkills(profileId, activeSkillTemplate.key);
    setSkillMessage('Skill identity updated.');
    setSavingSkills(false);
  }

  if (loading) {
    return (
      <main className="px-6 py-6">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white p-6 shadow-sm">
          Loading profile...
        </div>
      </main>
    );
  }

  const publicReadinessChecks = [
    Boolean((profile?.full_name || fullName).trim()),
    Boolean((profile?.location || location).trim()),
    Boolean((profile?.main_sport || mainSport).trim()),
    selectedRoleValues.length > 0,
    organizations.length > 0,
    historyEntries.length > 0,
    mergedSkillCards.length > 0,
  ];
  const publicReadinessScore = Math.round(
    (publicReadinessChecks.filter(Boolean).length / publicReadinessChecks.length) * 100
  );
  const publicReadinessLabel =
    publicReadinessScore >= 85
      ? 'Strong public profile'
      : publicReadinessScore >= 65
      ? 'Good foundation'
      : 'Early profile';
  const publicNextSteps = [
    !(profile?.full_name || fullName).trim() && 'Add your full name',
    !(profile?.location || location).trim() && 'Add your location',
    !(profile?.main_sport || mainSport).trim() && 'Choose your main sport',
    selectedRoleValues.length === 0 && 'Add at least one role',
    organizations.length === 0 && 'Join or create an organization',
    historyEntries.length === 0 && 'Add your sporting history',
    mergedSkillCards.length === 0 && 'Build your skill identity',
  ].filter(Boolean) as string[];
  const openToLabels = getOpenToLabelsForRoles(selectedRoleValues);
  const topValidatedSkills = [...mergedSkillCards]
    .sort((a, b) => (skillValidationCounts[b.key] || 0) - (skillValidationCounts[a.key] || 0))
    .slice(0, 3);

  if (!profile) {
    return (
      <main className="px-6 py-6">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white p-6 shadow-sm">
          Profile not found.
        </div>
      </main>
    );
  }

  return (
    <main className="px-6 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="h-56 bg-gradient-to-r from-slate-900 via-sky-700 to-emerald-500" />

          <div className="p-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="flex-1">
                <div className="-mt-20 flex h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-slate-900 text-3xl font-semibold text-white shadow-md">
                  {getInitials(profile.full_name || fullName || 'Asobu User')}
                </div>

                <h1 className="mt-4 text-3xl font-bold text-slate-900">
                  {profile.full_name || fullName || 'No name yet'}
                </h1>

                <p className="mt-2 text-slate-600">{formatRoleSummary(selectedRoleValues, primaryRole)}</p>

                <p className="mt-1 text-slate-500">{profile.location || location || 'No location yet'}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedRoleValues.map((role) => (
                    <span
                      key={role}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        role === primaryRole ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {formatPersonRoleLabel(role)}
                      {role === primaryRole ? ' · primary' : ''}
                    </span>
                  ))}

                  {(profile.main_sport || mainSport) && (
                    <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
                      {getPrimarySportLabelFromValue(profile.main_sport || mainSport)}
                    </span>
                  )}
                </div>
              </div>

              <div className="w-full max-w-[360px] rounded-[28px] bg-slate-50 p-5 xl:min-w-[340px]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Public profile readiness</p>
                    <p className="mt-1 text-sm text-slate-500">{publicReadinessLabel}</p>
                  </div>
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                    {publicReadinessScore}%
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-3">
                  <div className="rounded-[20px] bg-white p-4 text-center">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Roles</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{selectedRoleValues.length}</p>
                  </div>
                  <div className="rounded-[20px] bg-white p-4 text-center">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Orgs</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{organizations.length}</p>
                  </div>
                  <div className="rounded-[20px] bg-white p-4 text-center">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">History</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{historyEntries.length}</p>
                  </div>
                  <div className="rounded-[20px] bg-white p-4 text-center">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Skills</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{mergedSkillCards.length}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  {profileId && (
                    <Link
                      to={`/profiles/${profileId}`}
                      className="inline-flex flex-1 items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
                    >
                      View public profile
                    </Link>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="rounded-[28px] bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">Identity summary</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {getIdentityContextLabel(selectedRoleValues, primaryRole)}
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Your public Asobu profile should feel like a mix of sports identity, social proof, and discoverability. Media, sporting history, and validated skills all increase trust.
                </p>
              </div>

              <div className="rounded-[28px] bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">Open to on Asobu</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {openToLabels.length > 0 ? (
                    openToLabels.map((item) => (
                      <span key={item} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                      Build your identity
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  This helps explain who should reach you on the platform as your public presence grows.
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-[28px] border border-slate-200 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">What the public profile is becoming</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    The public profile is now a real destination for discovery on Asobu. It can now combine media, sporting history, and a techier skill identity that feels closer to a sports network than a classic CV.
                  </p>
                </div>

                <div className="rounded-[24px] bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {publicNextSteps.length > 0
                    ? `${publicNextSteps.length} next step${publicNextSteps.length > 1 ? 's' : ''} to strengthen visibility`
                    : 'Public foundation looks strong'}
                </div>
              </div>

              {publicNextSteps.length > 0 && (
                <div className="mt-5 rounded-[24px] bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Recommended next steps</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {publicNextSteps.map((step) => (
                      <span key={step} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                        {step}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Edit profile</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Keep the core identity clean and consistent. The public profile pulls its foundation from these details.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSave} className="mt-6 grid grid-cols-1 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Full name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Roles</label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {PERSON_ROLE_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRoles[option.value]}
                          onChange={() => handleRoleToggle(option.value)}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Primary role</label>
                  <select
                    value={primaryRole}
                    onChange={(e) => setPrimaryRole(e.target.value as PersonRole)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                  >
                    {selectedRoleValues.map((role) => (
                      <option key={role} value={role}>
                        {formatPersonRoleLabel(role)}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-slate-500">
                    The primary role stays your main public identity, while the other roles remain part of your deeper profile structure.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                    placeholder="Lugano, Switzerland"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Main sport</label>
                  <select
                    value={mainSport}
                    onChange={(e) => setMainSport(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                  >
                    <option value="">Choose a sport</option>
                    {SPORT_REGISTRATION_OPTIONS.map((sport) => (
                      <option key={sport.value} value={sport.label}>
                        {sport.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : 'Save profile'}
                  </button>
                </div>

                {message && <p className="text-sm text-slate-600">{message}</p>}
              </form>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Skill identity</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {activeSkillTemplate.intro}
                  </p>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {activeSkillTemplate.label}
                </div>
              </div>

              {!skillsAvailable ? (
                <div className="mt-5 rounded-[24px] bg-slate-50 p-4 text-sm text-slate-600">
                  Skill identity becomes available after the SQL bundle is applied in Supabase.
                </div>
              ) : (
                <>
                  <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <SkillRadarChart title={`${activeSkillTemplate.sportLabel} skill map`} points={radarPoints} />

                    <div className="space-y-3">
                      <div className="rounded-[28px] bg-slate-50 p-5">
                        <p className="text-sm font-semibold text-slate-900">Validation pulse</p>
                        <p className="mt-2 text-sm leading-7 text-slate-600">
                          {activeSkillTemplate.validationLabel}. Self ratings build the graph, while validations create social proof.
                        </p>
                      </div>

                      {topValidatedSkills.map((skill) => (
                        <div key={skill.key} className="rounded-[24px] border border-slate-200 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">{skill.label}</p>
                              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                                {skill.shortLabel}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-slate-900">{skill.selfRating}</p>
                              <p className="text-xs text-slate-500">
                                {skillValidationCounts[skill.key] || 0} validation{(skillValidationCounts[skill.key] || 0) === 1 ? '' : 's'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {mergedSkillCards.map((skill) => (
                      <div key={skill.key} className="rounded-[24px] bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{skill.label}</p>
                            <p className="mt-1 text-sm text-slate-500">{skill.description}</p>
                          </div>
                          <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                            {skillValidationCounts[skill.key] || 0} validation{(skillValidationCounts[skill.key] || 0) === 1 ? '' : 's'}
                          </div>
                        </div>

                        <div className="mt-4 flex items-center gap-4">
                          <input
                            type="range"
                            min="20"
                            max="99"
                            value={skillRatings[skill.key] ?? skill.selfRating}
                            onChange={(e) =>
                              setSkillRatings((current) => ({
                                ...current,
                                [skill.key]: Number(e.target.value),
                              }))
                            }
                            className="w-full"
                          />
                          <div className="w-14 rounded-xl bg-white px-3 py-2 text-center text-sm font-bold text-slate-900">
                            {Math.round(skillRatings[skill.key] ?? skill.selfRating)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-slate-500">
                      Start with honest self-assessment. Validations from the network can strengthen the profile over time.
                    </p>
                    <button
                      type="button"
                      onClick={handleSaveSkills}
                      disabled={savingSkills}
                      className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                      {savingSkills ? 'Saving...' : 'Save skill identity'}
                    </button>
                  </div>

                  {skillMessage && <p className="mt-4 text-sm text-slate-600">{skillMessage}</p>}
                </>
              )}
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Sporting history</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Build the timeline of your development. This should feel more like a structured sports journey than a plain CV.
                  </p>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {historyEntries.length} entries
                </div>
              </div>

              {!historyAvailable ? (
                <div className="mt-5 rounded-[24px] bg-slate-50 p-4 text-sm text-slate-600">
                  Sporting history becomes available after the SQL bundle is applied in Supabase.
                </div>
              ) : (
                <>
                  <form onSubmit={handleSaveHistory} className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Organization name</label>
                      <input
                        type="text"
                        value={historyForm.organizationName}
                        onChange={(e) =>
                          setHistoryForm((current) => ({ ...current, organizationName: e.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                        placeholder="FC Lugano U21"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Organization type</label>
                      <select
                        value={historyForm.organizationType}
                        onChange={(e) =>
                          setHistoryForm((current) => ({ ...current, organizationType: e.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                      >
                        {ORGANIZATION_REGISTRATION_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Role in that phase</label>
                      <input
                        type="text"
                        value={historyForm.roleLabel}
                        onChange={(e) =>
                          setHistoryForm((current) => ({ ...current, roleLabel: e.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                        placeholder="Central midfielder / Assistant coach"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Location</label>
                      <input
                        type="text"
                        value={historyForm.location}
                        onChange={(e) =>
                          setHistoryForm((current) => ({ ...current, location: e.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                        placeholder="Lugano, Switzerland"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Start date</label>
                      <input
                        type="date"
                        value={historyForm.startDate}
                        onChange={(e) =>
                          setHistoryForm((current) => ({ ...current, startDate: e.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">End date</label>
                      <input
                        type="date"
                        value={historyForm.endDate}
                        disabled={historyForm.isCurrent}
                        onChange={(e) =>
                          setHistoryForm((current) => ({ ...current, endDate: e.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300 disabled:opacity-50"
                      />
                    </div>

                    <div className="lg:col-span-2">
                      <label className="mb-2 flex items-center gap-3 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={historyForm.isCurrent}
                          onChange={(e) =>
                            setHistoryForm((current) => ({
                              ...current,
                              isCurrent: e.target.checked,
                              endDate: e.target.checked ? '' : current.endDate,
                            }))
                          }
                        />
                        This is a current phase
                      </label>
                    </div>

                    <div className="lg:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-slate-700">Summary</label>
                      <textarea
                        value={historyForm.summary}
                        onChange={(e) =>
                          setHistoryForm((current) => ({ ...current, summary: e.target.value }))
                        }
                        className="min-h-[110px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                        placeholder="What mattered in this phase? Development stage, level, responsibilities, or achievements."
                      />
                    </div>

                    <div className="lg:col-span-2 flex flex-wrap gap-3">
                      <button
                        type="submit"
                        disabled={savingHistory}
                        className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                      >
                        {savingHistory
                          ? 'Saving...'
                          : editingHistoryId
                          ? 'Update history entry'
                          : 'Add history entry'}
                      </button>

                      {editingHistoryId && (
                        <button
                          type="button"
                          onClick={resetHistoryForm}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Cancel edit
                        </button>
                      )}
                    </div>

                    {historyMessage && <p className="lg:col-span-2 text-sm text-slate-600">{historyMessage}</p>}
                  </form>

                  <div className="mt-8 space-y-3">
                    {historyEntries.length > 0 ? (
                      historyEntries.map((entry) => (
                        <div key={entry.id} className="rounded-[24px] border border-slate-200 p-4">
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-slate-900">{entry.organization_name}</p>
                                {entry.is_current && (
                                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                                    Current
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-sm text-slate-500">
                                {(entry.role_label || 'Role not specified') + ' · ' + (entry.location || 'No location')}
                              </p>
                              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                                {formatHistoryPeriod(entry)}
                              </p>
                              {entry.summary && (
                                <p className="mt-3 text-sm leading-7 text-slate-600">{entry.summary}</p>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => populateHistoryForm(entry)}
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteHistory(entry.id)}
                                className="rounded-2xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[24px] bg-slate-50 p-4 text-sm text-slate-500">
                        No sporting history yet. Start with your current club, team, academy, or coaching phase.
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Create organization</h2>

              <form onSubmit={handleCreateOrganization} className="mt-6 grid grid-cols-1 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Organization name</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                    placeholder="FC Asobu Academy"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Organization type</label>
                  <select
                    value={orgType}
                    onChange={(e) => setOrgType(e.target.value as OrganizationRegistrationType)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                  >
                    {ORGANIZATION_REGISTRATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-slate-500">
                    {ORGANIZATION_REGISTRATION_OPTIONS.find((option) => option.value === orgType)?.description || ''}
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Main sport</label>
                  <select
                    value={orgSport}
                    onChange={(e) => setOrgSport(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                  >
                    <option value="">Choose a sport</option>
                    {SPORT_REGISTRATION_OPTIONS.map((sport) => (
                      <option key={sport.value} value={sport.label}>
                        {sport.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Location</label>
                  <input
                    type="text"
                    value={orgLocation}
                    onChange={(e) => setOrgLocation(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                    placeholder="Zurich, Switzerland"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Description</label>
                  <textarea
                    value={orgDescription}
                    onChange={(e) => setOrgDescription(e.target.value)}
                    className="min-h-[100px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                    placeholder="Short description"
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={creatingOrg}
                    className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {creatingOrg ? 'Creating...' : 'Create organization'}
                  </button>
                </div>

                {orgMessage && <p className="text-sm text-slate-600">{orgMessage}</p>}
              </form>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Your organizations</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    These organizations currently shape your visible Asobu context.
                  </p>
                </div>
                <Link to="/organizations" className="text-sm font-medium text-sky-700 hover:text-sky-800">
                  Browse all
                </Link>
              </div>

              <div className="mt-5 space-y-3">
                {organizations.length > 0 ? (
                  organizations.map((organization) => (
                    <Link
                      key={organization.id}
                      to={`/organizations/${organization.id}`}
                      className="flex items-start justify-between gap-4 rounded-[24px] border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white">
                          {organization.logo_url ? (
                            <img
                              src={organization.logo_url}
                              alt={organization.name}
                              className="h-full w-full rounded-2xl object-contain p-1.5"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
                              {getInitials(organization.name)}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-900">{organization.name}</h3>
                          <p className="mt-1 text-sm text-slate-500 capitalize">
                            {organization.organization_type || 'organization'} · {organization.member_role}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {organization.location || 'No location'}
                          </p>
                        </div>
                      </div>

                      <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
                        {getPrimarySportLabelFromValue(organization.sport)}
                      </span>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-[24px] bg-slate-50 p-4 text-sm text-slate-500">
                    You are not part of any organization yet. Joining or creating one will strengthen your public profile and discovery context.
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

export default ProfilePage;
