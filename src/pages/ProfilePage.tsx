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
  type PersonRole,
} from '../lib/identity';
import {
  buildDefaultSkillRatings,
  mergeSkillEntriesWithTemplate,
  resolveSkillTemplate,
  type SkillEntryValue,
  type SkillValidationSummary,
} from '../lib/skills';
import {
  getPositionGroupLabel,
  getPositionLabel,
  getPositionOptionsForSport,
} from '../lib/positions';
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

type SearchableOrganization = {
  id: number;
  name: string;
  organization_type: string | null;
  sport: string | null;
  location: string | null;
  description: string | null;
  logo_url?: string | null;
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

type HistoryOrganizationRef = {
  id: number;
  name: string;
  organization_type: string | null;
  sport: string | null;
  location: string | null;
  logo_url?: string | null;
};

type SportingHistoryRow = {
  id: number;
  user_id: string;
  sport: string | null;
  organization_id: number | null;
  organization_name: string;
  organization_type: string | null;
  position_key: string | null;
  role_label: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  summary: string | null;
  created_at: string | null;
  updated_at: string | null;
  organizations: HistoryOrganizationRef | HistoryOrganizationRef[] | null;
};

type SportingHistoryEntry = SportingHistoryRow & {
  organizations: HistoryOrganizationRef | null;
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

type SkillValidationSummaryRow = {
  skill_entry_id: number;
  lower_count: number;
  fair_count: number;
  higher_count: number;
  total_count: number;
  average_vote: number;
};

type RoleSelectionState = Record<PersonRole, boolean>;

type HistoryFormState = {
  sport: string;
  positionKey: string;
  organizationSearch: string;
  selectedOrganizationId: number | null;
  createOrganizationInline: boolean;
  inlineOrganizationName: string;
  inlineOrganizationType: string;
  inlineOrganizationLocation: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  summary: string;
};

const EMPTY_HISTORY_FORM: HistoryFormState = {
  sport: '',
  positionKey: '',
  organizationSearch: '',
  selectedOrganizationId: null,
  createOrganizationInline: false,
  inlineOrganizationName: '',
  inlineOrganizationType: 'team',
  inlineOrganizationLocation: '',
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

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
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
  const [allOrganizations, setAllOrganizations] = useState<SearchableOrganization[]>([]);

  const [fullName, setFullName] = useState('');
  const [location, setLocation] = useState('');
  const [mainSport, setMainSport] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<RoleSelectionState>(
    buildRoleSelectionMap(['player'])
  );
  const [primaryRole, setPrimaryRole] = useState<PersonRole>('player');


  const [historyEntries, setHistoryEntries] = useState<SportingHistoryEntry[]>([]);
  const [historyForm, setHistoryForm] = useState<HistoryFormState>(EMPTY_HISTORY_FORM);
  const [editingHistoryId, setEditingHistoryId] = useState<number | null>(null);
  const [historyAvailable, setHistoryAvailable] = useState(true);
  const [savingHistory, setSavingHistory] = useState(false);
  const [historyMessage, setHistoryMessage] = useState('');

  const [skillEntries, setSkillEntries] = useState<ProfileSkillEntry[]>([]);
  const [skillRatings, setSkillRatings] = useState<Record<string, number>>({});
  const [skillValidationSummaries, setSkillValidationSummaries] = useState<Record<string, SkillValidationSummary>>({});
  const [skillsAvailable, setSkillsAvailable] = useState(true);
  const [savingSkills, setSavingSkills] = useState(false);
  const [skillMessage, setSkillMessage] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingBasics, setEditingBasics] = useState(false);
  const [editingSkills, setEditingSkills] = useState(false);
  const [showHistoryForm, setShowHistoryForm] = useState(false);
  const [message, setMessage] = useState('');

  const selectedRoleValues = useMemo(
    () =>
      PERSON_ROLE_OPTIONS.filter((option) => selectedRoles[option.value]).map(
        (option) => option.value
      ),
    [selectedRoles]
  );

  const historyPositionOptions = useMemo(
    () => getPositionOptionsForSport(historyForm.sport || profile?.main_sport || mainSport || null),
    [historyForm.sport, profile?.main_sport, mainSport]
  );

  const filteredHistoryOrganizations = useMemo(() => {
    const query = historyForm.organizationSearch.trim().toLowerCase();
    const selectedSport = (historyForm.sport || profile?.main_sport || mainSport || '').toLowerCase();

    return allOrganizations
      .filter((organization) => {
        const matchesQuery =
          !query ||
          organization.name.toLowerCase().includes(query) ||
          (organization.location || '').toLowerCase().includes(query);
        const matchesSport =
          !selectedSport ||
          !(organization.sport || '').trim() ||
          (organization.sport || '').toLowerCase().includes(selectedSport);
        return matchesQuery && matchesSport;
      })
      .slice(0, 8);
  }, [allOrganizations, historyForm.organizationSearch, historyForm.sport, profile?.main_sport, mainSport]);

  const selectedHistoryOrganization = useMemo(
    () => allOrganizations.find((organization) => organization.id === historyForm.selectedOrganizationId) || null,
    [allOrganizations, historyForm.selectedOrganizationId]
  );

  const activeSportValue = profile?.main_sport || mainSport;
  const activeSkillTemplate = useMemo(
    () => resolveSkillTemplate(activeSportValue),
    [activeSportValue]
  );

  const mergedSkillCards = useMemo(
    () =>
      mergeSkillEntriesWithTemplate(
        activeSkillTemplate,
        skillEntries as SkillEntryValue[],
        skillValidationSummaries
      ),
    [activeSkillTemplate, skillEntries, skillValidationSummaries]
  );

  const radarPoints = useMemo(
    () =>
      mergedSkillCards.map((skill) => ({
        label: skill.label,
        shortLabel: skill.shortLabel,
        value: skill.communityScore,
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
        setHistoryForm((current) => ({
          ...current,
          sport: current.sport || typedProfile.main_sport || '',
        }));
        await loadProfileRoles(user.id, typedProfile);
      }

      await Promise.all([
        loadOrganizations(user.id),
        loadAllOrganizations(),
        loadSportingHistory(user.id),
      ]);
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
    const primaryFromTable = typedRoles.find((item) => item.is_primary)?.role as PersonRole | undefined;
    const safePrimary = primaryFromTable && safeRoles.includes(primaryFromTable) ? primaryFromTable : safeRoles[0];

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
        const organization = firstRelation(item.organizations);
        if (!organization) return null;
        return {
          ...organization,
          member_role: item.member_role || 'member',
        };
      })
      .filter(Boolean) as OrganizationWithRole[];

    setOrganizations(mapped);
  }

  async function loadAllOrganizations() {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, organization_type, sport, location, description, logo_url')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error loading searchable organizations:', error.message);
      setAllOrganizations([]);
      return;
    }

    setAllOrganizations((data as SearchableOrganization[]) || []);
  }

  async function loadSportingHistory(userId: string) {
    const { data, error } = await supabase
      .from('sporting_history_entries')
      .select(
        'id, user_id, sport, organization_id, organization_name, organization_type, position_key, role_label, location, start_date, end_date, is_current, summary, created_at, updated_at, organizations(id, name, organization_type, sport, location, logo_url)'
      )
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
    setHistoryEntries(((data as SportingHistoryRow[]) || []).map((entry) => ({
      ...entry,
      organizations: firstRelation(entry.organizations),
    })));
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
        Object.fromEntries(
          buildDefaultSkillRatings(activeSkillTemplate).map((entry) => [entry.skill_key, entry.self_rating])
        )
      );
      setSkillValidationSummaries({});
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
      setSkillValidationSummaries({});
      return;
    }

    const entryMap = new Map(typedEntries.map((entry) => [entry.id, entry.skill_key]));

    const { data: summaryData, error: summaryError } = await supabase.rpc(
      'get_skill_validation_summary_for_profile',
      {
        p_profile_user_id: userId,
        p_sport: sportKey,
      }
    );

    if (summaryError) {
      console.warn('Skill validation summary unavailable:', summaryError.message);
      setSkillValidationSummaries({});
      return;
    }

    const summaries: Record<string, SkillValidationSummary> = {};

    for (const row of (summaryData as SkillValidationSummaryRow[]) || []) {
      const skillKey = entryMap.get(row.skill_entry_id);
      if (!skillKey) continue;
      summaries[skillKey] = {
        lowerCount: row.lower_count || 0,
        fairCount: row.fair_count || 0,
        higherCount: row.higher_count || 0,
        totalCount: row.total_count || 0,
        averageVote: Number(row.average_vote || 0),
      };
    }

    setSkillValidationSummaries(summaries);
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

    const { error: deleteRolesError } = await supabase.from('profile_roles').delete().eq('user_id', profileId);

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


  function populateHistoryForm(entry: SportingHistoryEntry) {
    setEditingHistoryId(entry.id);
    setHistoryForm({
      sport: entry.sport || profile?.main_sport || mainSport || '',
      positionKey: entry.position_key || '',
      organizationSearch: entry.organization_name,
      selectedOrganizationId: entry.organization_id || entry.organizations?.id || null,
      createOrganizationInline: false,
      inlineOrganizationName: '',
      inlineOrganizationType: entry.organization_type || 'team',
      inlineOrganizationLocation: entry.location || '',
      startDate: entry.start_date || '',
      endDate: entry.end_date || '',
      isCurrent: entry.is_current,
      summary: entry.summary || '',
    });
  }

  function resetHistoryForm() {
    setEditingHistoryId(null);
    setHistoryForm({
      ...EMPTY_HISTORY_FORM,
      sport: profile?.main_sport || mainSport || '',
    });
    setHistoryMessage('');
  }

  async function handleSaveHistory(e: React.FormEvent) {
    e.preventDefault();

    if (!profileId || !(historyForm.sport || '').trim() || !historyForm.positionKey) return;

    setSavingHistory(true);
    setHistoryMessage('');

    let linkedOrganization = selectedHistoryOrganization;

    if (!linkedOrganization && historyForm.createOrganizationInline) {
      if (!historyForm.inlineOrganizationName.trim()) {
        setHistoryMessage('Choose an existing organization or create a new one first.');
        setSavingHistory(false);
        return;
      }

      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: historyForm.inlineOrganizationName.trim(),
          organization_type: historyForm.inlineOrganizationType,
          sport: historyForm.sport.trim() || null,
          location: historyForm.inlineOrganizationLocation.trim() || null,
          description: null,
          created_by: profileId,
        })
        .select('id, name, organization_type, sport, location, description, logo_url')
        .single();

      if (orgError) {
        setHistoryMessage(`Error: ${orgError.message}`);
        setSavingHistory(false);
        return;
      }

      const { error: memberError } = await supabase.from('organization_members').insert({
        organization_id: orgData.id,
        user_id: profileId,
        member_role: 'owner',
      });

      if (memberError) {
        setHistoryMessage(`Error: ${memberError.message}`);
        setSavingHistory(false);
        return;
      }

      linkedOrganization = orgData as SearchableOrganization;
      await Promise.all([loadOrganizations(profileId), loadAllOrganizations()]);
    }

    if (!linkedOrganization) {
      setHistoryMessage('Select an existing organization or create it inline first.');
      setSavingHistory(false);
      return;
    }

    const payload = {
      user_id: profileId,
      sport: historyForm.sport.trim() || null,
      organization_id: linkedOrganization.id,
      organization_name: linkedOrganization.name,
      organization_type: linkedOrganization.organization_type || null,
      position_key: historyForm.positionKey,
      role_label: getPositionLabel(historyForm.sport, historyForm.positionKey),
      location: linkedOrganization.location || historyForm.inlineOrganizationLocation.trim() || null,
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
      <main className="px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white p-6 shadow-sm">Loading profile...</div>
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
    publicReadinessScore >= 85 ? 'Strong public profile' : publicReadinessScore >= 65 ? 'Good foundation' : 'Early profile';
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

  if (!profile) {
    return (
      <main className="px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white p-6 shadow-sm">Profile not found.</div>
      </main>
    );
  }

  return (
    <main className="px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="h-56 bg-gradient-to-r from-slate-900 via-teal-700 to-emerald-500" />

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

              <div className="w-full max-w-[340px] rounded-[28px] bg-slate-50 p-5 xl:min-w-[320px]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Public profile readiness</p>
                    <p className="mt-1 text-sm text-slate-500">{publicReadinessLabel}</p>
                  </div>
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                    {publicReadinessScore}%
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {publicNextSteps.length > 0 ? (
                    publicNextSteps.map((step) => (
                      <div key={step} className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                        {step}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                      Your public profile already has a strong base for discovery.
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    to={`/profiles/${profile.id}`}
                    className="inline-flex flex-1 items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    View public profile
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="rounded-[28px] bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">Profile strength</p>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-[20px] bg-white p-4 text-center">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Roles</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{selectedRoleValues.length}</p>
                  </div>
                  <div className="rounded-[20px] bg-white p-4 text-center">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Orgs</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{organizations.length}</p>
                  </div>
                  <div className="rounded-[20px] bg-white p-4 text-center">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">History</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{historyEntries.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-slate-900">Profile basics</h2>
                <button type="button" onClick={() => setEditingBasics(b => \!b)} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  {editingBasics ? 'Cancel' : 'Edit'}
                </button>
              </div>

              {\!editingBasics ? (
                <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Name</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{fullName || 'Not set'}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Location</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{location || 'Not set'}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Sport</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{mainSport ? getPrimarySportLabelFromValue(mainSport) : 'Not set'}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Primary role</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{primaryRole ? formatPersonRoleLabel(primaryRole) : 'Not set'}</p>
                  </div>
                </div>
              ) : (
              <form onSubmit={handleSave} className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Full name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                  />
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
                </div>

                <div className="lg:col-span-2">
                  <label className="mb-3 block text-sm font-medium text-slate-700">Roles</label>
                  <div className="flex flex-wrap gap-3">
                    {PERSON_ROLE_OPTIONS.map((roleOption) => {
                      const isSelected = selectedRoles[roleOption.value];
                      return (
                        <button
                          key={roleOption.value}
                          type="button"
                          onClick={() => handleRoleToggle(roleOption.value)}
                          className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                            isSelected
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {roleOption.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="lg:col-span-2 flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : 'Save profile'}
                  </button>
                </div>

                {message && <p className="lg:col-span-2 text-sm text-slate-600">{message}</p>}
              </form>
              )}
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-slate-900">Skill identity</h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {activeSkillTemplate.sportLabel}
                  </span>
                </div>
                <button type="button" onClick={() => setEditingSkills(s => \!s)} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  {editingSkills ? 'Done' : 'Edit ratings'}
                </button>
              </div>

              {!skillsAvailable ? (
                <div className="mt-5 rounded-[24px] bg-slate-50 p-4 text-sm text-slate-600">
                  Skills become available after the SQL bundle is applied in Supabase.
                </div>
              ) : (
                <>
                  <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                    <div className="rounded-[28px] bg-slate-50 p-5">
                      <SkillRadarChart
                        points={radarPoints}
                        title={activeSkillTemplate.label}
                      />
                    </div>

                    <div className="space-y-4">
                      {mergedSkillCards.map((skill) => (
                        <div key={skill.key} className="rounded-[24px] border border-slate-200 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">{skill.label}</p>
                              <p className="mt-1 text-sm leading-7 text-slate-500">{skill.description}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                                Self {skill.selfRating}
                              </span>
                              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                                Community {skill.communityScore}
                              </span>
                            </div>
                          </div>

                          {editingSkills && (
                          <>
                          <input
                            type="range"
                            min={20}
                            max={99}
                            value={skillRatings[skill.key] ?? skill.selfRating}
                            onChange={(e) =>
                              setSkillRatings((current) => ({
                                ...current,
                                [skill.key]: Number(e.target.value),
                              }))
                            }
                            className="mt-4 w-full accent-teal-600"
                          />

                          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                            <span>Self rating</span>
                            <span>{skill.validationSummary.totalCount} anonymous votes</span>
                          </div>
                          <p className="mt-2 text-[11px] text-slate-400">
                            {skill.validationSummary.higherCount} higher · {skill.validationSummary.fairCount} fair · {skill.validationSummary.lowerCount} lower
                          </p>
                          </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {editingSkills && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleSaveSkills}
                      disabled={savingSkills}
                      className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                      {savingSkills ? 'Saving...' : 'Save skill identity'}
                    </button>
                  </div>
                  )}

                  {skillMessage && <p className="mt-4 text-sm text-slate-600">{skillMessage}</p>}
                </>
              )}
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Structured sporting history</h2>
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
                  {\!showHistoryForm && \!editingHistoryId && (
                    <button type="button" onClick={() => setShowHistoryForm(true)} className="mt-5 w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-center text-sm font-medium text-slate-600 hover:border-slate-400 hover:bg-slate-100">
                      + Add sporting history
                    </button>
                  )}
                  {(showHistoryForm || editingHistoryId) && <form onSubmit={handleSaveHistory} className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Sport</label>
                      <select
                        value={historyForm.sport}
                        onChange={(e) =>
                          setHistoryForm((current) => ({
                            ...current,
                            sport: e.target.value,
                            positionKey: '',
                            selectedOrganizationId: null,
                          }))
                        }
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
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        {getPositionGroupLabel(historyForm.sport || profile?.main_sport || mainSport || null)}
                      </label>
                      <select
                        value={historyForm.positionKey}
                        onChange={(e) =>
                          setHistoryForm((current) => ({ ...current, positionKey: e.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                      >
                        <option value="">Choose a position</option>
                        {historyPositionOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="lg:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-slate-700">Find existing organization</label>
                      <input
                        type="text"
                        value={historyForm.organizationSearch}
                        onChange={(e) =>
                          setHistoryForm((current) => ({
                            ...current,
                            organizationSearch: e.target.value,
                            selectedOrganizationId: null,
                            createOrganizationInline: false,
                            inlineOrganizationName: e.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                        placeholder="Search for Rugby Lugano, FC Lugano, Volley Team..."
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        Select the real organization if it already exists. If not, create it below so this sporting phase stays linked to the same shared club or team other players can find.
                      </p>
                    </div>

                    {selectedHistoryOrganization ? (
                      <div className="lg:col-span-2 rounded-[24px] border border-sky-200 bg-sky-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{selectedHistoryOrganization.name}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {(selectedHistoryOrganization.organization_type || 'organization') +
                                ' · ' +
                                (selectedHistoryOrganization.location || 'No location')}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setHistoryForm((current) => ({
                                ...current,
                                selectedOrganizationId: null,
                                organizationSearch: '',
                              }))
                            }
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    ) : filteredHistoryOrganizations.length > 0 ? (
                      <div className="lg:col-span-2 rounded-[24px] border border-slate-200 bg-white p-3">
                        <div className="space-y-2">
                          {filteredHistoryOrganizations.map((organization) => (
                            <button
                              key={organization.id}
                              type="button"
                              onClick={() =>
                                setHistoryForm((current) => ({
                                  ...current,
                                  selectedOrganizationId: organization.id,
                                  organizationSearch: organization.name,
                                  createOrganizationInline: false,
                                }))
                              }
                              className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50"
                            >
                              <div>
                                <p className="font-medium text-slate-900">{organization.name}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {(organization.organization_type || 'organization') +
                                    ' · ' +
                                    (organization.location || 'No location')}
                                </p>
                              </div>
                              <span className="rounded-full bg-sky-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                                {getPrimarySportLabelFromValue(organization.sport)}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : historyForm.organizationSearch.trim() ? (
                      <div className="lg:col-span-2 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-4">
                        <label className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={historyForm.createOrganizationInline}
                            onChange={(e) =>
                              setHistoryForm((current) => ({
                                ...current,
                                createOrganizationInline: e.target.checked,
                                inlineOrganizationName: current.organizationSearch || current.inlineOrganizationName,
                              }))
                            }
                          />
                          <span className="text-sm leading-7 text-slate-600">
                            I can’t find this organization. Create it now so it becomes a real shared club or team on Asobu.
                          </span>
                        </label>
                      </div>
                    ) : null}

                    {historyForm.createOrganizationInline && !selectedHistoryOrganization && (
                      <>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">New organization name</label>
                          <input
                            type="text"
                            value={historyForm.inlineOrganizationName}
                            onChange={(e) =>
                              setHistoryForm((current) => ({ ...current, inlineOrganizationName: e.target.value }))
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                            placeholder="Rugby Lugano"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">Organization type</label>
                          <select
                            value={historyForm.inlineOrganizationType}
                            onChange={(e) =>
                              setHistoryForm((current) => ({ ...current, inlineOrganizationType: e.target.value }))
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

                        <div className="lg:col-span-2">
                          <label className="mb-2 block text-sm font-medium text-slate-700">Organization location</label>
                          <input
                            type="text"
                            value={historyForm.inlineOrganizationLocation}
                            onChange={(e) =>
                              setHistoryForm((current) => ({ ...current, inlineOrganizationLocation: e.target.value }))
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                            placeholder="Lugano, Switzerland"
                          />
                        </div>
                      </>
                    )}

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
                        This is my current phase
                      </label>
                    </div>

                    <div className="lg:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-slate-700">Summary</label>
                      <textarea
                        value={historyForm.summary}
                        onChange={(e) =>
                          setHistoryForm((current) => ({ ...current, summary: e.target.value }))
                        }
                        className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                        placeholder="Describe the role, development stage, or what made this phase important."
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
                          ? 'Update sporting history'
                          : 'Add sporting history'}
                      </button>

                      <button
                          type="button"
                          onClick={() => { resetHistoryForm(); setShowHistoryForm(false); }}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                    </div>

                    {historyMessage && <p className="lg:col-span-2 text-sm text-slate-600">{historyMessage}</p>}
                  </form>}

                  <div className="mt-5 space-y-3">
                    {historyEntries.length > 0 ? (
                      historyEntries.map((entry) => (
                        <div key={entry.id} className="rounded-[24px] border border-slate-200 p-4">
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                {entry.organization_id ? (
                                  <Link to={`/organizations/${entry.organization_id}`} className="font-semibold text-slate-900 hover:text-sky-700">
                                    {entry.organization_name}
                                  </Link>
                                ) : (
                                  <p className="font-semibold text-slate-900">{entry.organization_name}</p>
                                )}
                                {entry.is_current && (
                                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                                    Current
                                  </span>
                                )}
                              </div>

                              <div className="mt-2 flex flex-wrap gap-2">
                                <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
                                  {getPrimarySportLabelFromValue(entry.sport)}
                                </span>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                                  {getPositionLabel(entry.sport, entry.position_key)}
                                </span>
                              </div>

                              <p className="mt-2 text-sm text-slate-500">
                                {(entry.organization_type || 'organization') + ' · ' + (entry.location || 'No location')}
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
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Your organizations</h2>
                </div>
                <div className="flex items-center gap-2">
                  <Link to="/organizations" className="text-sm font-medium text-sky-700 hover:text-sky-800">
                    Browse all
                  </Link>
                  <Link to="/organizations" className="btn-secondary px-3 py-2 text-xs">
                    Create
                  </Link>
                </div>
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
                          <p className="mt-1 text-sm text-slate-500">{organization.location || 'No location'}</p>
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
