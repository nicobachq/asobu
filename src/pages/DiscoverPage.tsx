import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  formatPersonRoleLabel,
  formatOrganizationTypeLabel,
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

type DbProfile = {
  id: string;
  full_name: string | null;
  role: string | null;
  location: string | null;
  main_sport: string | null;
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
  avatar_url?: string | null;
  cover_image_url?: string | null;
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
  const [profiles, setProfiles] = useState<DiscoverProfile[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeTab, setActiveTab] = useState<DiscoverTab>("players");
  const [searchTerm, setSearchTerm] = useState("");
  const [sportFilter, setSportFilter] = useState("all");

  useEffect(() => {
    async function loadDiscoverPage() {
      setLoading(true);

      await Promise.all([loadDiscoverProfiles(), loadOrganizations()]);
      setLoading(false);
    }

    void loadDiscoverPage();
  }, []);


  async function loadDiscoverProfiles() {
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, role, location, main_sport, avatar_url, cover_image_url")
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
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
          <h1 className="text-2xl font-semibold text-slate-950 sm:text-3xl">Discover</h1>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              { key: "players", label: "Players", count: tabCounts.players },
              { key: "coaches", label: "Coaches", count: tabCounts.coaches },
              { key: "organizations", label: "Organizations", count: tabCounts.organizations },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as DiscoverTab)}
                  className={[
                    'rounded-[24px] border p-4 text-left transition',
                    isActive ? 'border-slate-900 bg-slate-900 text-white shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold">{tab.label}</h2>
                    <span className={isActive ? 'text-white/75' : 'text-slate-500'}>{tab.count}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={activeTab === 'organizations' ? 'Search organizations' : `Search ${activeTab}`}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-slate-300"
            />
            <select
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
            >
              {DISCOVER_SPORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </section>

        <section className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
          {loading ? (
            <p className="text-sm text-slate-500">Loading results...</p>
          ) : resultCount === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
              No results.
            </div>
          ) : activeTab === 'organizations' ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredOrganizations.map((organization) => (
                <Link
                  key={organization.id}
                  to={`/organizations/${organization.id}`}
                  className="overflow-hidden rounded-[24px] border border-slate-200 bg-white transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div
                    className="h-40 bg-gradient-to-r from-slate-900 via-sky-700 to-emerald-500"
                    style={organization.cover_image_url ? { backgroundImage: `url(${organization.cover_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                  />
                  <div className="p-4">
                    <div className="-mt-12 flex items-start gap-3">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border-4 border-white bg-white shadow-sm">
                        {organization.logo_url ? (
                          <img src={organization.logo_url} alt={organization.name} className="h-full w-full rounded-[1.1rem] object-contain p-2" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center rounded-[1.1rem] bg-slate-900 text-lg font-semibold text-white">
                            {getInitials(organization.name)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 pt-10">
                        <h3 className="break-words text-lg font-semibold text-slate-900">{organization.name}</h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{formatOrganizationTypeLabel(organization.organization_type)}</span>
                          {organization.sport ? <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">{getPrimarySportLabelFromValue(organization.sport)}</span> : null}
                        </div>
                        {organization.location ? <p className="mt-3 text-sm text-slate-500">{organization.location}</p> : null}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {filteredProfiles.map((item) => {
                const roles = getUniquePersonRoles([...item.roles, item.role]);
                return (
                  <Link
                    key={item.id}
                    to={`/profiles/${item.id}`}
                    className="rounded-[24px] border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        {item.avatar_url ? (
                          <img src={item.avatar_url} alt={item.full_name || 'Profile'} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
                            {getInitials(item.full_name || 'Athlete')}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-lg font-semibold text-slate-900">{item.full_name || 'Athlete'}</h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {roles.map((role) => (
                            <span key={role} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                              {formatPersonRoleLabel(role)}
                            </span>
                          ))}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-500">
                          {item.location ? <span className="break-words">{item.location}</span> : null}
                          {item.organization_name ? <span className="break-words">{item.organization_name}</span> : null}
                        </div>
                        {getSportLabelsFromValue(item.main_sport).length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {getSportLabelsFromValue(item.main_sport).map((sport) => (
                              <span key={sport} className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">{sport}</span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default DiscoverPage;
