import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import SkillRadarChart from '../components/SkillRadarChart';
import SkillValueBar from '../components/SkillValueBar';
import {
  buildRoleSelectionMap,
  formatPersonRoleLabel,
  formatRoleSummary,
  getIdentityContextLabel,
  getOpenToLabelsForRoles,
  getOrganizationTypeAudienceLabel,
  getUniquePersonRoles,
  ORGANIZATION_REGISTRATION_OPTIONS,
  PERSON_ROLE_OPTIONS,
  type OrganizationRegistrationType,
  type PersonRole,
} from '../lib/identity';
import {
  buildDefaultSkillRatings,
  getSkillQuerySportKeys,
  hasCompleteSkillIdentity,
  mergeSkillEntriesWithTemplate,
  resolveSkillTemplate,
  seedSkillEntriesFromLegacy,
  type SkillEntryValue,
  type SkillTemplate,
  type SkillValidationSummary,
} from '../lib/skills';
import {
  getPositionGroupLabel,
  getPositionLabel,
  getPositionOptionsForSport,
} from '../lib/positions';
import { getPrimarySportLabelFromValue, SPORT_REGISTRATION_OPTIONS } from '../lib/sports';
import {
  MAX_PROFILE_AVATAR_SIZE_BYTES,
  MAX_PROFILE_BANNER_SIZE_BYTES,
  revokeObjectUrl,
  uploadProfileMedia,
  validateImageFile,
} from '../lib/media';
import { supabase } from '../lib/supabase';

type Profile = {
  id: string;
  full_name: string | null;
  role: string | null;
  location: string | null;
  main_sport: string | null;
  avatar_url?: string | null;
  cover_image_url?: string | null;
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
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('');
  const [profileCoverImageUrl, setProfileCoverImageUrl] = useState('');
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');
  const [coverPreviewUrl, setCoverPreviewUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<RoleSelectionState>(
    buildRoleSelectionMap(['player'])
  );
  const [primaryRole, setPrimaryRole] = useState<PersonRole>('player');
  const [savedRoleSelection, setSavedRoleSelection] = useState<RoleSelectionState>(
    buildRoleSelectionMap(['player'])
  );
  const [savedPrimaryRole, setSavedPrimaryRole] = useState<PersonRole>('player');

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
  const [skillValidationSummaries, setSkillValidationSummaries] = useState<Record<string, SkillValidationSummary>>({});
  const [skillsAvailable, setSkillsAvailable] = useState(true);
  const [savingSkills, setSavingSkills] = useState(false);
  const [skillMessage, setSkillMessage] = useState('');
  const [skillSeedMessage, setSkillSeedMessage] = useState('');
  const [skillSourceSportKey, setSkillSourceSportKey] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [message, setMessage] = useState('');
  const [orgMessage, setOrgMessage] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const selectedRoleValues = useMemo(
    () =>
      PERSON_ROLE_OPTIONS.filter((option) => selectedRoles[option.value]).map(
        (option) => option.value
      ),
    [selectedRoles]
  );

  useEffect(() => {
    return () => {
      revokeObjectUrl(avatarPreviewUrl);
      revokeObjectUrl(coverPreviewUrl);
    };
  }, [avatarPreviewUrl, coverPreviewUrl]);

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

  const historyValidationHint = useMemo(() => {
    if (!(historyForm.sport || '').trim()) {
      return 'Choose the sport for this phase.';
    }

    if (!historyForm.positionKey) {
      return 'Choose the position or role for this phase.';
    }

    if (selectedHistoryOrganization) {
      return '';
    }

    if (historyForm.createOrganizationInline) {
      if (!historyForm.inlineOrganizationName.trim()) {
        return 'Name the organization you want to create.';
      }
      return '';
    }

    if (historyForm.organizationSearch.trim()) {
      return 'Select one of the matching organizations, or create it inline below.';
    }

    return 'Search and select an organization, or create it inline below.';
  }, [
    historyForm.createOrganizationInline,
    historyForm.inlineOrganizationName,
    historyForm.organizationSearch,
    historyForm.positionKey,
    historyForm.sport,
    selectedHistoryOrganization,
  ]);

  const activeSportValue = mainSport || profile?.main_sport;
  const activeSkillTemplate = useMemo(
    () => resolveSkillTemplate(activeSportValue),
    [activeSportValue]
  );

  const skillPreviewEntries = useMemo(
    () =>
      activeSkillTemplate.skills.map((skill) => ({
        skill_key: skill.key,
        self_rating:
          skillRatings[skill.key] ??
          skillEntries.find((entry) => entry.skill_key === skill.key)?.self_rating ??
          60,
      })),
    [activeSkillTemplate, skillEntries, skillRatings]
  );

  const mergedSkillCards = useMemo(
    () =>
      mergeSkillEntriesWithTemplate(
        activeSkillTemplate,
        skillPreviewEntries,
        skillValidationSummaries
      ),
    [activeSkillTemplate, skillPreviewEntries, skillValidationSummaries]
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
        setProfileAvatarUrl(typedProfile.avatar_url || '');
        setProfileCoverImageUrl(typedProfile.cover_image_url || '');
        setAvatarPreviewUrl(typedProfile.avatar_url || '');
        setCoverPreviewUrl(typedProfile.cover_image_url || '');
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
      await loadProfileSkills(profileId, activeSkillTemplate);
    }

    loadSkillsForCurrentTemplate();
  }, [profileId, activeSkillTemplate]);

  async function loadProfileRoles(userId: string, currentProfile: Profile) {
    const { data, error } = await supabase
      .from('profile_roles')
      .select('id, user_id, role, sport, is_primary, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('profile_roles unavailable, falling back to profile.role:', error.message);
      const fallbackPrimary = getUniquePersonRoles([currentProfile.role])[0] || 'player';
      const fallbackSelection = buildRoleSelectionMap([fallbackPrimary]);
      setSelectedRoles(fallbackSelection);
      setSavedRoleSelection(fallbackSelection);
      setPrimaryRole(fallbackPrimary);
      setSavedPrimaryRole(fallbackPrimary);
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

    const nextSelection = buildRoleSelectionMap(safeRoles);
    setSelectedRoles(nextSelection);
    setSavedRoleSelection(nextSelection);
    setPrimaryRole(safePrimary);
    setSavedPrimaryRole(safePrimary);
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

  async function loadProfileSkills(userId: string, template: SkillTemplate) {
    const querySportKeys = getSkillQuerySportKeys(template);
    const { data, error } = await supabase
      .from('profile_skill_entries')
      .select('*')
      .eq('user_id', userId)
      .in('sport', querySportKeys)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('skill_key', { ascending: true });

    if (error) {
      console.warn('profile_skill_entries unavailable:', error.message);
      setSkillsAvailable(false);
      setSkillEntries([]);
      setSkillSourceSportKey(null);
      setSkillSeedMessage('');
      setSkillRatings(
        Object.fromEntries(
          buildDefaultSkillRatings(template).map((entry) => [entry.skill_key, entry.self_rating])
        )
      );
      setSkillValidationSummaries({});
      return;
    }

    const typedEntries = (data as ProfileSkillEntry[]) || [];
    const actualEntries = typedEntries.filter((entry) => entry.sport === template.key);
    setSkillsAvailable(true);

    if (actualEntries.length > 0) {
      setSkillEntries(actualEntries);
      setSkillSourceSportKey(template.key);
      setSkillSeedMessage('');
      setSkillRatings(
        Object.fromEntries(
          mergeSkillEntriesWithTemplate(template, actualEntries).map((entry) => [entry.key, entry.selfRating])
        )
      );

      const entryMap = new Map(actualEntries.map((entry) => [entry.id, entry.skill_key]));

      const { data: summaryData, error: summaryError } = await supabase.rpc(
        'get_skill_validation_summary_for_profile',
        {
          p_profile_user_id: userId,
          p_sport: template.key,
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
      return;
    }

    const legacySourceKey = template.legacySportKeys.find((key) =>
      typedEntries.some((entry) => entry.sport === key)
    );

    if (legacySourceKey) {
      const legacyEntries = typedEntries.filter((entry) => entry.sport === legacySourceKey);
      const seededEntries = seedSkillEntriesFromLegacy(template, legacySourceKey, legacyEntries);
      setSkillEntries([]);
      setSkillSourceSportKey(legacySourceKey);
      setSkillSeedMessage(
        `Your earlier ${legacySourceKey === 'generic' ? 'generic' : legacySourceKey} ratings were used to prefill this new ${template.sportLabel.toLowerCase()} skill pack. Save once to lock the sport-specific version.`
      );
      setSkillRatings(
        Object.fromEntries(seededEntries.map((entry) => [entry.skill_key, entry.self_rating]))
      );
      setSkillValidationSummaries({});
      return;
    }

    setSkillEntries([]);
    setSkillSourceSportKey(null);
    setSkillSeedMessage('');
    setSkillRatings(
      Object.fromEntries(
        buildDefaultSkillRatings(template).map((entry) => [entry.skill_key, entry.self_rating])
      )
    );
    setSkillValidationSummaries({});
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


  function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    const validationError = validateImageFile(file, MAX_PROFILE_AVATAR_SIZE_BYTES, 'Profile photo');
    if (validationError) {
      setMessage(validationError);
      return;
    }

    revokeObjectUrl(avatarPreviewUrl);
    const nextPreviewUrl = URL.createObjectURL(file);
    setAvatarFile(file);
    setProfileAvatarUrl('');
    setAvatarPreviewUrl(nextPreviewUrl);
    setMessage('');
  }

  function handleCoverFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    const validationError = validateImageFile(file, MAX_PROFILE_BANNER_SIZE_BYTES, 'Profile banner');
    if (validationError) {
      setMessage(validationError);
      return;
    }

    revokeObjectUrl(coverPreviewUrl);
    const nextPreviewUrl = URL.createObjectURL(file);
    setCoverFile(file);
    setProfileCoverImageUrl('');
    setCoverPreviewUrl(nextPreviewUrl);
    setMessage('');
  }

  function handleRemoveAvatar() {
    revokeObjectUrl(avatarPreviewUrl);
    setAvatarFile(null);
    setProfileAvatarUrl('');
    setAvatarPreviewUrl('');
  }

  function handleRemoveCover() {
    revokeObjectUrl(coverPreviewUrl);
    setCoverFile(null);
    setProfileCoverImageUrl('');
    setCoverPreviewUrl('');
  }

  function handleStartProfileEdit() {
    setMessage('');
    setIsEditingProfile(true);
  }

  function handleCancelProfileEdit() {
    setMessage('');
    setIsEditingProfile(false);
    setFullName(profile?.full_name || '');
    setLocation(profile?.location || '');
    setMainSport(profile?.main_sport || '');
    setSelectedRoles(savedRoleSelection);
    setPrimaryRole(savedPrimaryRole);

    revokeObjectUrl(avatarPreviewUrl);
    revokeObjectUrl(coverPreviewUrl);
    setAvatarFile(null);
    setCoverFile(null);
    setProfileAvatarUrl(profile?.avatar_url || '');
    setProfileCoverImageUrl(profile?.cover_image_url || '');
    setAvatarPreviewUrl(profile?.avatar_url || '');
    setCoverPreviewUrl(profile?.cover_image_url || '');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!profileId || selectedRoleValues.length === 0) return;

    setSaving(true);
    setMessage('');

    let nextAvatarUrl: string | null = profileAvatarUrl.trim() || null;
    let nextCoverImageUrl: string | null = profileCoverImageUrl.trim() || null;

    try {
      if (avatarFile) {
        nextAvatarUrl = await uploadProfileMedia(avatarFile, profileId, 'avatar');
      }

      if (coverFile) {
        nextCoverImageUrl = await uploadProfileMedia(coverFile, profileId, 'banner');
      }
    } catch (uploadError) {
      setMessage(uploadError instanceof Error ? `Error: ${uploadError.message}` : 'Error uploading profile media.');
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        role: primaryRole,
        location,
        main_sport: mainSport,
        avatar_url: nextAvatarUrl,
        cover_image_url: nextCoverImageUrl,
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
            avatar_url: nextAvatarUrl,
            cover_image_url: nextCoverImageUrl,
          }
        : prev
    );
    setSavedRoleSelection(buildRoleSelectionMap(selectedRoleValues));
    setSavedPrimaryRole(primaryRole);
    setProfileAvatarUrl(nextAvatarUrl || '');
    setProfileCoverImageUrl(nextCoverImageUrl || '');
    setAvatarPreviewUrl(nextAvatarUrl || '');
    setCoverPreviewUrl(nextCoverImageUrl || '');
    setAvatarFile(null);
    setCoverFile(null);
    setMessage('Profile updated successfully.');
    setIsEditingProfile(false);
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

    await Promise.all([loadOrganizations(profileId), loadAllOrganizations()]);
    setCreatingOrg(false);
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

  function resetHistoryForm(options?: { preserveMessage?: boolean }) {
    setEditingHistoryId(null);
    setHistoryForm({
      ...EMPTY_HISTORY_FORM,
      sport: profile?.main_sport || mainSport || '',
    });
    if (!options?.preserveMessage) {
      setHistoryMessage('');
    }
  }

  async function handleSaveHistory(e: React.FormEvent) {
    e.preventDefault();

    if (!profileId) {
      setHistoryMessage('Your profile is still loading. Please try again in a moment.');
      return;
    }

    if (!(historyForm.sport || '').trim()) {
      setHistoryMessage('Choose the sport for this sporting phase.');
      return;
    }

    if (!historyForm.positionKey) {
      setHistoryMessage('Choose the position or role for this sporting phase.');
      return;
    }

    setSavingHistory(true);
    setHistoryMessage('');

    let linkedOrganization =
      selectedHistoryOrganization ||
      allOrganizations.find((organization) => {
        const query = historyForm.organizationSearch.trim().toLowerCase();
        if (!query) return false;
        return organization.name.trim().toLowerCase() === query;
      }) ||
      (filteredHistoryOrganizations.length === 1 ? filteredHistoryOrganizations[0] : null);

    if (linkedOrganization && linkedOrganization.id !== historyForm.selectedOrganizationId) {
      setHistoryForm((current) => ({
        ...current,
        selectedOrganizationId: linkedOrganization?.id || null,
        organizationSearch: linkedOrganization?.name || current.organizationSearch,
        createOrganizationInline: false,
      }));
    }

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
    resetHistoryForm({ preserveMessage: true });
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

    await loadProfileSkills(profileId, activeSkillTemplate);
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
    Boolean((avatarPreviewUrl || '').trim()),
    Boolean((coverPreviewUrl || '').trim()),
    selectedRoleValues.length > 0,
    organizations.length > 0,
    historyEntries.length > 0,
    Boolean(skillSourceSportKey),
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
    !(avatarPreviewUrl || '').trim() && 'Add a profile photo',
    !(coverPreviewUrl || '').trim() && 'Add a profile banner',
    selectedRoleValues.length === 0 && 'Add at least one role',
    organizations.length === 0 && 'Join or create an organization',
    historyEntries.length === 0 && 'Add your sporting history',
    !skillSourceSportKey && 'Build your skill identity',
  ].filter(Boolean) as string[];
  const openToLabels = getOpenToLabelsForRoles(selectedRoleValues);
  const hasSavedSportSpecificSkills =
    skillSourceSportKey === activeSkillTemplate.key &&
    hasCompleteSkillIdentity(activeSkillTemplate, skillEntries as SkillEntryValue[]);

  const isSkillIdentityLocked = hasSavedSportSpecificSkills;

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
          <div
            className="h-56 bg-gradient-to-r from-slate-900 via-sky-700 to-emerald-500"
            style={
              coverPreviewUrl
                ? {
                    backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.28), rgba(15, 23, 42, 0.10)), url(${coverPreviewUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : undefined
            }
          />

          <div className="p-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="flex-1">
                <div className="-mt-20 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-900 text-3xl font-semibold text-white shadow-md">
                  {avatarPreviewUrl ? (
                    <img src={avatarPreviewUrl} alt={profile.full_name || fullName || 'Asobu User'} className="h-full w-full object-cover" />
                  ) : (
                    getInitials(profile.full_name || fullName || 'Asobu User')
                  )}
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
                  {isEditingProfile ? (
                    <button
                      type="button"
                      onClick={handleCancelProfileEdit}
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Cancel editing
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartProfileEdit}
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Edit profile
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="rounded-[28px] bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">Identity summary</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {getIdentityContextLabel(selectedRoleValues, primaryRole)}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {openToLabels.length > 0 ? (
                    openToLabels.map((item) => (
                      <span key={item} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                      Building identity
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-[28px] bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">Trusted signals</p>
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
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Profile basics</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Keep your profile structured and standardized so scouts, coaches, and organizations can compare people more clearly.
                  </p>
                </div>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${isEditingProfile ? 'bg-[color:color-mix(in_oklab,var(--asobu-primary)_14%,white_86%)] text-[var(--asobu-primary-dark)]' : 'bg-slate-100 text-slate-600'}`}>
                  {isEditingProfile ? 'Editing profile' : 'View mode'}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
                <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-900">Profile photo</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Your photo appears in your profile, discover cards, and other identity surfaces.
                  </p>
                  <div className="mt-5 flex items-center gap-4">
                    <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[linear-gradient(135deg,color-mix(in_oklab,var(--asobu-primary)_18%,white_82%),color-mix(in_oklab,var(--asobu-warm)_14%,white_86%))] text-2xl font-semibold text-[var(--asobu-primary-dark)] shadow-sm">
                      {avatarPreviewUrl ? (
                        <img src={avatarPreviewUrl} alt={profile.full_name || fullName || 'Asobu User'} className="h-full w-full object-cover" />
                      ) : (
                        getInitials(profile.full_name || fullName || 'Asobu User')
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {isEditingProfile ? (
                        <>
                          <label className="app-button-primary inline-flex cursor-pointer items-center justify-center rounded-full px-4 py-2 text-sm font-semibold">
                            Choose photo
                            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarFileChange} />
                          </label>
                          <button type="button" onClick={handleRemoveAvatar} className="app-button-secondary rounded-full px-4 py-2 text-sm font-medium">
                            Remove
                          </button>
                        </>
                      ) : (
                        <span className="rounded-full bg-white px-4 py-2 text-center text-sm font-medium text-slate-500">
                          Edit mode required
                        </span>
                      )}
                    </div>
                  </div>
                  {avatarFile && <p className="mt-3 text-xs text-slate-500">{avatarFile.name}</p>}
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Profile banner</p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        Add a wide image so your profile feels more complete and distinctive when shared publicly.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {isEditingProfile ? (
                        <>
                          <label className="app-button-primary inline-flex cursor-pointer items-center justify-center rounded-full px-4 py-2 text-sm font-semibold">
                            Choose banner
                            <input type="file" accept="image/*" className="hidden" onChange={handleCoverFileChange} />
                          </label>
                          <button type="button" onClick={handleRemoveCover} className="app-button-secondary rounded-full px-4 py-2 text-sm font-medium">
                            Remove
                          </button>
                        </>
                      ) : (
                        <span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-500">Edit mode required</span>
                      )}
                    </div>
                  </div>
                  <div
                    className="mt-5 h-40 rounded-[24px] border border-dashed border-slate-200 bg-gradient-to-br from-white via-[color:color-mix(in_oklab,var(--asobu-primary)_10%,white_90%)] to-[color:color-mix(in_oklab,var(--asobu-warm)_10%,white_90%)]"
                    style={
                      coverPreviewUrl
                        ? {
                            backgroundImage: `linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02)), url(${coverPreviewUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }
                        : undefined
                    }
                  />
                  {coverFile && <p className="mt-3 text-xs text-slate-500">{coverFile.name}</p>}
                </div>
              </div>

              <p className="mt-4 text-xs font-medium text-slate-500">
                {isEditingProfile
                  ? 'Photo and banner changes are saved together with your profile update below.'
                  : 'Start edit mode to change your photo, banner, or identity details.'}
              </p>

              <form onSubmit={handleSave} className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Full name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={!isEditingProfile}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none ${isEditingProfile ? 'border-slate-200 bg-slate-50 focus:border-slate-300' : 'border-slate-100 bg-slate-100 text-slate-500 cursor-not-allowed'}`}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={!isEditingProfile}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none ${isEditingProfile ? 'border-slate-200 bg-slate-50 focus:border-slate-300' : 'border-slate-100 bg-slate-100 text-slate-500 cursor-not-allowed'}`}
                    placeholder="Lugano, Switzerland"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Main sport</label>
                  <select
                    value={mainSport}
                    onChange={(e) => setMainSport(e.target.value)}
                    disabled={!isEditingProfile}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none ${isEditingProfile ? 'border-slate-200 bg-slate-50 focus:border-slate-300' : 'border-slate-100 bg-slate-100 text-slate-500 cursor-not-allowed'}`}
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
                    disabled={!isEditingProfile}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none ${isEditingProfile ? 'border-slate-200 bg-slate-50 focus:border-slate-300' : 'border-slate-100 bg-slate-100 text-slate-500 cursor-not-allowed'}`}
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
                          disabled={!isEditingProfile}
                          className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${!isEditingProfile ? 'cursor-not-allowed opacity-60 ' : ''}${
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
                  {isEditingProfile ? (
                    <>
                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                      >
                        {saving ? 'Saving...' : 'Save changes'}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelProfileEdit}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartProfileEdit}
                      className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
                    >
                      Edit profile
                    </button>
                  )}
                </div>

                {message && <p className="lg:col-span-2 text-sm text-slate-600">{message}</p>}
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
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {activeSkillTemplate.sportLabel}
                </span>
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

                          <SkillValueBar
                            value={skillRatings[skill.key] ?? skill.selfRating}
                            isLocked={isSkillIdentityLocked}
                            ariaLabel={`${skill.label} self rating`}
                            onChange={(nextValue) =>
                              setSkillRatings((current) => ({
                                ...current,
                                [skill.key]: nextValue,
                              }))
                            }
                          />

                          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                            <span>Self rating</span>
                            <span>{skill.validationSummary.totalCount} anonymous votes</span>
                          </div>
                          <p className="mt-2 text-[11px] text-slate-400">
                            {skill.validationSummary.higherCount} higher · {skill.validationSummary.fairCount} fair · {skill.validationSummary.lowerCount} lower
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {(skillSeedMessage || isSkillIdentityLocked) && (
                    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      {skillSeedMessage || 'This sport-specific skill identity is locked after the first save.'}
                    </div>
                  )}

                  {!isSkillIdentityLocked ? (
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleSaveSkills}
                        disabled={savingSkills}
                        className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                      >
                        {savingSkills ? 'Saving...' : skillSourceSportKey && skillSourceSportKey !== activeSkillTemplate.key ? 'Save sport-specific skill identity' : 'Save skill identity'}
                      </button>
                    </div>
                  ) : null}

                  {skillMessage && <p className="mt-4 text-sm text-slate-600">{skillMessage}</p>}
                </>
              )}
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Structured sporting history</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Build the timeline of your development using a real sport, a standardized position, and a shared club or team on Asobu.
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

                      {editingHistoryId && (
                        <button
                          type="button"
                          onClick={() => resetHistoryForm()}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Cancel edit
                        </button>
                      )}
                    </div>

                    {historyValidationHint && !historyMessage && (
                      <p className="lg:col-span-2 text-sm text-slate-500">{historyValidationHint}</p>
                    )}
                    {historyMessage && <p className="lg:col-span-2 text-sm text-slate-600">{historyMessage}</p>}
                  </form>

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
              <h2 className="text-xl font-semibold text-slate-900">Create organization</h2>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                On Asobu, organization is the umbrella for {getOrganizationTypeAudienceLabel().toLowerCase()}. Choose the type that best fits what you are building.
              </p>

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
