import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  formatPersonRoleLabel,
  formatRoleSummary,
  formatOrganizationTypeLabel,
  getIdentityContextLabel,
  getOpenToLabelsForRoles,
  getOrganizationTypeAudienceLabel,
  getUniquePersonRoles,
  normalizePersonRole,
  type PersonRole,
} from "../lib/identity";
import {
  DISCOVER_SPORT_OPTIONS,
  getNormalizedSportsFromValue,
  getPrimarySportLabelFromValue,
  getSportLabelsFromValue,
} from "../lib/sports";
import ProfileCard from "../components/ProfileCard";

type DbProfile = {
  id: string;
  full_name: string | null;
  role: string | null;
  location: string | null;
  main_sport: string | null;
};

type ProfileCardData = {
  name: string;
  role: string;
  location: string;
  sports: string[];
  organization: string;
  openTo: string[];
};

type MembershipLookupRow = {
  organization_id: number;
};

type OrganizationNameRow = {
  name: string;
};

type RelatedOrganization = {
  id: number;
  name: string;
  organization_type: string | null;
  sport: string | null;
  location: string | null;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
};

type RawMembershipOrganizationRow = {
  user_id: string;
  organizations: RelatedOrganization | RelatedOrganization[] | null;
};

type Organization = {
  id: number;
  name: string;
  organization_type: string | null;
  sport: string | null;
  location: string | null;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
};

type MemberCountRow = {
  organization_id: number;
};

type ProfileRoleRow = {
  user_id: string;
  role: string;
  sport: string | null;
  is_primary: boolean;
};

type DiscoverProfile = {
  id: string;
  full_name: string | null;
  role: string | null;
  location: string | null;
  main_sport: string | null;
  organization_name: string | null;
  roles: PersonRole[];
  primary_role: PersonRole | null;
};

type DiscoverTab = "players" | "coaches" | "organizations";

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "A"
  );
}

function roleMatchesTab(roles: PersonRole[], tab: DiscoverTab) {
  if (tab === "players") return roles.includes("player");
  if (tab === "coaches") return roles.includes("coach");
  return false;
}

function DiscoverPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileCardData>({
    name: "Loading...",
    role: "Loading...",
    location: "Loading...",
    sports: [],
    organization: "No organization yet",
    openTo: ["Teams", "Clubs", "Communities"],
  });

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<DiscoverProfile[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [memberCountsByOrg, setMemberCountsByOrg] = useState<Record<number, number>>({});
  const [activeTab, setActiveTab] = useState<DiscoverTab>("players");
  const [searchTerm, setSearchTerm] = useState("");
  const [sportFilter, setSportFilter] = useState("all");

  useEffect(() => {
    async function loadDiscoverPage() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUserId(user?.id ?? null);

      if (user) {
        await loadCurrentUserProfile(user.id);
      }

      await Promise.all([loadDiscoverProfiles(), loadOrganizations(), loadMemberCounts()]);
      setLoading(false);
    }

    void loadDiscoverPage();
  }, []);

  async function loadCurrentUserProfile(userId: string) {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();

    if (error) {
      console.error("Error loading discover profile card:", error.message);
      return;
    }

    const dbProfile = data as DbProfile;
    let firstOrganization = "No organization yet";

    const { data: membershipData, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      console.error("Error loading membership:", membershipError.message);
    } else if (membershipData) {
      const membership = membershipData as MembershipLookupRow;

      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", membership.organization_id)
        .single();

      if (orgError) {
        console.error("Error loading organization:", orgError.message);
      } else if (orgData) {
        const org = orgData as OrganizationNameRow;
        firstOrganization = org.name;
      }
    }

    let resolvedRoles = getUniquePersonRoles([dbProfile.role]);
    let resolvedPrimaryRole = normalizePersonRole(dbProfile.role);

    const { data: profileRoleData, error: profileRoleError } = await supabase
      .from("profile_roles")
      .select("user_id, role, sport, is_primary")
      .eq("user_id", userId);

    if (!profileRoleError) {
      const typedRoleRows = (profileRoleData as ProfileRoleRow[]) || [];
      if (typedRoleRows.length > 0) {
        resolvedRoles = getUniquePersonRoles(typedRoleRows.map((item) => item.role));
        resolvedPrimaryRole =
          normalizePersonRole(typedRoleRows.find((item) => item.is_primary)?.role) ||
          resolvedRoles[0] ||
          null;
      }
    }

    setProfile({
      name: dbProfile.full_name || "No name yet",
      role: formatRoleSummary(resolvedRoles, resolvedPrimaryRole),
      location: dbProfile.location || "No location yet",
      sports: getSportLabelsFromValue(dbProfile.main_sport),
      organization: firstOrganization,
      openTo: getOpenToLabelsForRoles(resolvedRoles),
    });
  }

  async function loadDiscoverProfiles() {
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, role, location, main_sport")
      .order("full_name", { ascending: true });

    if (profilesError) {
      console.error("Error loading profiles:", profilesError.message);
      setProfiles([]);
      return;
    }

    const typedProfiles = (profilesData as DbProfile[]) || [];
    const profileIds = typedProfiles.map((item) => item.id);

    let organizationNameByUserId: Record<string, string> = {};

    if (profileIds.length > 0) {
      const { data: membershipData, error: membershipError } = await supabase
        .from("organization_members")
        .select(
          "user_id, organizations(id, name, organization_type, sport, location, description, logo_url, cover_image_url)"
        )
        .in("user_id", profileIds);

      if (membershipError) {
        console.error("Error loading profile organizations:", membershipError.message);
      } else {
        organizationNameByUserId = ((membershipData as RawMembershipOrganizationRow[]) || []).reduce(
          (acc, row) => {
            if (!acc[row.user_id]) {
              const organization = firstRelation(row.organizations);
              if (organization?.name) {
                acc[row.user_id] = organization.name;
              }
            }
            return acc;
          },
          {} as Record<string, string>
        );
      }
    }

    let rolesByUserId: Record<string, PersonRole[]> = {};
    let primaryRoleByUserId: Record<string, PersonRole | null> = {};

    const { data: profileRoleData, error: profileRoleError } = await supabase
      .from("profile_roles")
      .select("user_id, role, sport, is_primary")
      .in("user_id", profileIds);

    if (profileRoleError) {
      console.warn("profile_roles unavailable, Discover is falling back to profile.role");
    } else {
      const typedRoleRows = (profileRoleData as ProfileRoleRow[]) || [];
      rolesByUserId = typedRoleRows.reduce((acc, row) => {
        const normalized = normalizePersonRole(row.role);
        if (!normalized) return acc;
        acc[row.user_id] = Array.from(new Set([...(acc[row.user_id] || []), normalized]));
        return acc;
      }, {} as Record<string, PersonRole[]>);

      primaryRoleByUserId = typedRoleRows.reduce((acc, row) => {
        if (row.is_primary) {
          acc[row.user_id] = normalizePersonRole(row.role);
        }
        return acc;
      }, {} as Record<string, PersonRole | null>);
    }

    const normalizedProfiles: DiscoverProfile[] = typedProfiles.map((item) => {
      const fallbackRoles = getUniquePersonRoles([item.role]);
      const resolvedRoles = rolesByUserId[item.id]?.length ? rolesByUserId[item.id] : fallbackRoles;
      const resolvedPrimaryRole =
        primaryRoleByUserId[item.id] || resolvedRoles[0] || normalizePersonRole(item.role);

      return {
        ...item,
        organization_name: organizationNameByUserId[item.id] || null,
        roles: resolvedRoles,
        primary_role: resolvedPrimaryRole,
      };
    });

    setProfiles(normalizedProfiles);
  }

  async function loadOrganizations() {
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name, organization_type, sport, location, description, logo_url, cover_image_url")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading organizations:", error.message);
      setOrganizations([]);
      return;
    }

    setOrganizations((data as Organization[]) || []);
  }

  async function loadMemberCounts() {
    const { data, error } = await supabase.from("organization_members").select("organization_id");

    if (error) {
      console.error("Error loading member counts:", error.message);
      setMemberCountsByOrg({});
      return;
    }

    const counts: Record<number, number> = {};
    for (const row of (data as MemberCountRow[]) || []) {
      counts[row.organization_id] = (counts[row.organization_id] || 0) + 1;
    }
    setMemberCountsByOrg(counts);
  }

  const filteredProfiles = useMemo(() => {
    return profiles.filter((item) => {
      if (!roleMatchesTab(item.roles, activeTab)) return false;

      const normalizedSearch = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !normalizedSearch ||
        (item.full_name || "").toLowerCase().includes(normalizedSearch) ||
        (item.location || "").toLowerCase().includes(normalizedSearch) ||
        (item.main_sport || "").toLowerCase().includes(normalizedSearch) ||
        (item.organization_name || "").toLowerCase().includes(normalizedSearch) ||
        item.roles.some((role) => formatPersonRoleLabel(role).toLowerCase().includes(normalizedSearch));

      const normalizedSports = getNormalizedSportsFromValue(item.main_sport);
      const matchesSport = sportFilter === "all" || normalizedSports.includes(sportFilter);

      return matchesSearch && matchesSport;
    });
  }, [profiles, activeTab, searchTerm, sportFilter]);

  const filteredOrganizations = useMemo(() => {
    return organizations.filter((item) => {
      if (activeTab !== "organizations") return false;

      const normalizedSearch = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !normalizedSearch ||
        item.name.toLowerCase().includes(normalizedSearch) ||
        (item.location || "").toLowerCase().includes(normalizedSearch) ||
        (item.sport || "").toLowerCase().includes(normalizedSearch) ||
        (item.organization_type || "").toLowerCase().includes(normalizedSearch);

      const normalizedSports = getNormalizedSportsFromValue(item.sport);
      const matchesSport = sportFilter === "all" || normalizedSports.includes(sportFilter);

      return matchesSearch && matchesSport;
    });
  }, [organizations, activeTab, searchTerm, sportFilter]);

  const tabCounts = useMemo(
    () => ({
      players: profiles.filter((item) => item.roles.includes("player")).length,
      coaches: profiles.filter((item) => item.roles.includes("coach")).length,
      organizations: organizations.length,
    }),
    [profiles, organizations]
  );

  const resultCount = activeTab === "organizations" ? filteredOrganizations.length : filteredProfiles.length;


  return (
    <main className="px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="app-hero overflow-hidden rounded-[32px] px-6 py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Discover</p>
              <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-slate-900 lg:text-4xl">
                Find the people and organizations that define your sporting network.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                Search people and organizations across sport, role, and context.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[460px]">
              <div className="rounded-[24px] border border-slate-200/80 bg-white/85 p-4 text-center shadow-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Players</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{tabCounts.players}</p>
              </div>
              <div className="rounded-[24px] border border-slate-200/80 bg-white/85 p-4 text-center shadow-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Coaches</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{tabCounts.coaches}</p>
              </div>
              <div className="rounded-[24px] border border-slate-200/80 bg-white/85 p-4 text-center shadow-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Organizations</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{tabCounts.organizations}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[290px_minmax(0,1fr)_300px]">
          <ProfileCard profile={profile} />

          <div className="space-y-6">
            <section className="app-card rounded-[32px] p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {[
                  { key: "players", label: "Players", count: tabCounts.players, note: "Athletes building public identity" },
                  { key: "coaches", label: "Coaches", count: tabCounts.coaches, note: "Leadership, staff, and guidance" },
                  { key: "organizations", label: "Organizations", count: tabCounts.organizations, note: "Teams, clubs, federations, communities" },
                ].map((tab) => {
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key as DiscoverTab)}
                      className={`rounded-[24px] border p-4 text-left transition ${
                        isActive
                          ? "border-[color:var(--asobu-primary)] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--asobu-primary)_12%,white_88%),color-mix(in_oklab,var(--asobu-warm)_8%,white_92%))] text-slate-900 shadow-[0_12px_24px_rgba(10,166,175,.08)]"
                          : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isActive ? "text-[var(--asobu-primary-dark)]" : "text-slate-400"}`}>
                            Explore
                          </p>
                          <h2 className="mt-2 text-lg font-bold">{tab.label}</h2>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{tab.note}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${isActive ? "bg-white text-[var(--asobu-primary-dark)]" : "bg-white text-slate-700"}`}>
                          {tab.count}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Search
                  </label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={activeTab === "organizations" ? "Search organizations, types, sports, or locations..." : `Search ${activeTab}...`}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-[var(--asobu-primary)] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Sport
                  </label>
                  <select
                    value={sportFilter}
                    onChange={(e) => setSportFilter(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[var(--asobu-primary)] focus:bg-white"
                  >
                    {DISCOVER_SPORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="app-card rounded-[32px] p-4 sm:p-6">
              {loading ? (
                <p className="text-sm text-slate-500">Loading discover results...</p>
              ) : resultCount === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-200 p-10 text-center">
                  <h2 className="text-lg font-semibold text-slate-900">No results found</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Try another search term, change the sport filter, or switch discover tabs.
                  </p>
                </div>
              ) : activeTab === "organizations" ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {filteredOrganizations.map((organization) => (
                    <Link
                      key={organization.id}
                      to={`/organizations/${organization.id}`}
                      className="app-card-hover overflow-hidden rounded-[28px] border border-slate-200 bg-white ring-1 ring-white/70"
                    >
                      <div
                        className="h-28 bg-gradient-to-br from-[color:color-mix(in_oklab,var(--asobu-primary)_14%,white_86%)] via-white to-[color:color-mix(in_oklab,var(--asobu-warm)_10%,white_90%)]"
                        style={
                          organization.cover_image_url
                            ? {
                                backgroundImage: `url(${organization.cover_image_url})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }
                            : undefined
                        }
                      />
                      <div className="p-4 sm:p-5">
                        <div className="-mt-10 flex flex-col gap-4 sm:-mt-12 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-[24px] border-4 border-white bg-white shadow-sm sm:h-20 sm:w-20 sm:rounded-3xl">
                              {organization.logo_url ? (
                                <img
                                  src={organization.logo_url}
                                  alt={organization.name}
                                  className="h-full w-full rounded-[1.1rem] object-contain p-2"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center rounded-[1.1rem] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--asobu-primary)_18%,white_82%),color-mix(in_oklab,var(--asobu-warm)_14%,white_86%))] text-lg font-semibold text-[var(--asobu-primary-dark)]">
                                  {getInitials(organization.name)}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 pt-10">
                              <h2 className="truncate text-lg font-bold text-slate-900 sm:text-xl">{organization.name}</h2>
                              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                                Organization type
                              </p>
                              <p className="mt-1 text-sm font-medium text-slate-700">
                                {formatOrganizationTypeLabel(organization.organization_type)}
                              </p>
                            </div>
                          </div>
                          <span className="self-start rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                            {memberCountsByOrg[organization.id] || 0} members
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="app-chip-brand rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
                            {getPrimarySportLabelFromValue(organization.sport)}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                            Open page
                          </span>
                        </div>

                        <p className="mt-4 line-clamp-3 text-sm leading-7 text-slate-600">
                          {organization.description || "No description yet."}
                        </p>

                        <p className="mt-4 text-sm text-slate-500">{organization.location || "No location"}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {filteredProfiles.map((item) => {
                    const isOwnCard = item.id === currentUserId;
                    const sportLabels = getSportLabelsFromValue(item.main_sport);

                    return (
                      <article key={item.id} className="app-card-hover overflow-hidden rounded-[28px] border border-slate-200 bg-white ring-1 ring-white/70">
                        <div className="h-24 bg-gradient-to-br from-[color:color-mix(in_oklab,var(--asobu-primary)_14%,white_86%)] via-white to-[color:color-mix(in_oklab,var(--asobu-warm)_10%,white_90%)]" />
                        <div className="p-4 sm:p-5">
                          <div className="-mt-12 flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-[linear-gradient(135deg,color-mix(in_oklab,var(--asobu-primary)_18%,white_82%),color-mix(in_oklab,var(--asobu-warm)_14%,white_86%))] text-lg font-semibold text-[var(--asobu-primary-dark)] shadow-sm">
                                {getInitials(item.full_name || "Asobu User")}
                              </div>
                              <div className="min-w-0 pt-8">
                                <h2 className="truncate text-xl font-bold text-slate-900">{item.full_name || "Unnamed user"}</h2>
                                <p className="mt-1 text-sm text-slate-500">{formatRoleSummary(item.roles, item.primary_role)}</p>
                              </div>
                            </div>
                            {item.primary_role && (
                              <span className="rounded-full bg-[linear-gradient(135deg,var(--asobu-primary-dark),var(--asobu-primary-light))] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                                {formatPersonRoleLabel(item.primary_role)}
                              </span>
                            )}
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {item.roles.map((role) => (
                              <span
                                key={role}
                                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                                  role === item.primary_role ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {formatPersonRoleLabel(role)}
                              </span>
                            ))}
                            {sportLabels.map((sport) => (
                              <span key={sport} className="app-chip-brand rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
                                {sport}
                              </span>
                            ))}
                            {item.location && <span className="text-xs text-slate-400">· {item.location}</span>}
                          </div>

                          <div className="mt-4 rounded-[24px] bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                            <p className="font-medium text-slate-900">{getIdentityContextLabel(item.roles, item.primary_role)}</p>
                            <p className="mt-2">
                              <span className="font-medium text-slate-900">Current organization:</span> {item.organization_name || "Independent"}
                            </p>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm">
                            <span className="text-slate-500">{item.organization_name || "Independent"}</span>
                            <div className="flex flex-wrap gap-2">
                              {!isOwnCard && (
                                <Link
                                  to={`/messages?with=${item.id}`}
                                  className="app-button-secondary rounded-full px-4 py-2 font-medium"
                                >
                                  Message
                                </Link>
                              )}
                              <Link
                                to={`/profiles/${item.id}`}
                                className="app-button-primary rounded-full px-4 py-2 font-medium"
                              >
                                View sports profile
                              </Link>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="app-card rounded-[32px] p-4 sm:p-5">
              <h2 className="text-lg font-semibold text-slate-900">Discover logic</h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                <p>
                  People appear with clearer multi-role identity. A coach who is also a player is no longer forced into one flat label.
                </p>
                <p>
                  Organizations are the umbrella layer for {getOrganizationTypeAudienceLabel().toLowerCase()}, while still remaining connected to real human owners.
                </p>
              </div>
            </section>

            <section className="app-card rounded-[32px] p-4 sm:p-5">
              <h2 className="text-lg font-semibold text-slate-900">What Discover is for</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Identity-first", "Sport filters", "Public profiles", "Organization context"].map((item) => (
                  <span
                    key={item}
                    className="app-chip-brand rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Discover should feel closer to a sports network search layer than a generic directory. The clearest identities and organizations should be the easiest to understand from one glance.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default DiscoverPage;
