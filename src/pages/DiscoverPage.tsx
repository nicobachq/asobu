import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  formatPersonRoleLabel,
  formatRoleSummary,
  getIdentityContextLabel,
  getOpenToLabelsForRoles,
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

      if (user) {
        await loadCurrentUserProfile(user.id);
      }

      await Promise.all([loadDiscoverProfiles(), loadOrganizations(), loadMemberCounts()]);
      setLoading(false);
    }

    loadDiscoverPage();
  }, []);

  async function loadCurrentUserProfile(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

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
      const resolvedRoles = rolesByUserId[item.id]?.length
        ? rolesByUserId[item.id]
        : fallbackRoles;
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
      if (!roleMatchesTab(item.roles, activeTab)) {
        return false;
      }

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
      if (activeTab !== "organizations") {
        return false;
      }

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

  const resultCount =
    activeTab === "organizations" ? filteredOrganizations.length : filteredProfiles.length;

  return (
    <main className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-6 py-6 lg:grid-cols-[290px_minmax(0,1fr)_300px]">
      <ProfileCard profile={profile} />

      <div className="space-y-5">
        <section className="rounded-[32px] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
                Discover
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                Explore the sports network
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Search for players, coaches, and organizations across Asobu. This
                layer now makes multi-role people clearer, so a coach who is also a
                player does not disappear behind one simple label.
              </p>
            </div>

            <div className="rounded-[24px] bg-slate-50 px-4 py-4">
              <p className="text-sm text-slate-500">Results</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{resultCount}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              { key: "players", label: "Players", count: tabCounts.players },
              { key: "coaches", label: "Coaches", count: tabCounts.coaches },
              { key: "organizations", label: "Organizations", count: tabCounts.organizations },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as DiscoverTab)}
                className={`rounded-[24px] border px-4 py-4 text-left transition ${
                  activeTab === tab.key
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{tab.label}</p>
                    <p className={`mt-1 text-xs ${activeTab === tab.key ? "text-white/75" : "text-slate-500"}`}>
                      {tab.key === "organizations"
                        ? "Clubs, teams, federations, and entities"
                        : tab.key === "players"
                        ? "Athletes and sports identities"
                        : "Coaches and technical leaders"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      activeTab === tab.key
                        ? "bg-white/15 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {tab.count}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Search by name, sport, location, role, or organization
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search ${activeTab}...`}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-slate-300"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Filter by sport
              </label>
              <select
                value={sportFilter}
                onChange={(e) => setSportFilter(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
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

        <section className="rounded-[32px] bg-white p-6 shadow-sm">
          {loading ? (
            <p className="text-sm text-slate-500">Loading discover results...</p>
          ) : resultCount === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
              <h2 className="text-lg font-semibold text-slate-900">No results found</h2>
              <p className="mt-2 text-sm text-slate-500">
                Try another search term, change the sport filter, or broaden the role you
                are exploring.
              </p>
            </div>
          ) : activeTab === "organizations" ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredOrganizations.map((organization) => (
                <Link
                  key={organization.id}
                  to={`/organizations/${organization.id}`}
                  className="overflow-hidden rounded-[28px] border border-slate-200 bg-white transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div
                    className="h-28 bg-gradient-to-r from-slate-900 via-sky-700 to-emerald-500"
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

                  <div className="p-5">
                    <div className="-mt-11 flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border-4 border-white bg-white shadow-sm">
                          {organization.logo_url ? (
                            <img
                              src={organization.logo_url}
                              alt={organization.name}
                              className="h-full w-full rounded-[1.1rem] object-contain p-2"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center rounded-[1.1rem] bg-slate-900 text-lg font-semibold text-white">
                              {getInitials(organization.name)}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 pt-10">
                          <h2 className="truncate text-xl font-semibold text-slate-900">
                            {organization.name}
                          </h2>
                          <p className="mt-1 text-sm font-medium capitalize text-slate-600">
                            {organization.organization_type || "organization"}
                          </p>
                        </div>
                      </div>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {memberCountsByOrg[organization.id] || 0} members
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
                        {getPrimarySportLabelFromValue(organization.sport)}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 capitalize">
                        {organization.organization_type || "organization"}
                      </span>
                    </div>

                    <p className="mt-4 line-clamp-3 text-sm leading-7 text-slate-600">
                      {organization.description || "No description yet."}
                    </p>

                    <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-500">
                      <span>{organization.location || "No location"}</span>
                      <span className="font-medium text-slate-700">Open page</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredProfiles.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[28px] border border-slate-200 p-5 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-900 text-lg font-semibold text-white">
                        {getInitials(item.full_name || "Asobu User")}
                      </div>

                      <div className="min-w-0">
                        <h2 className="truncate text-xl font-semibold text-slate-900">
                          {item.full_name || "Unnamed user"}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatRoleSummary(item.roles, item.primary_role)}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {item.location || "No location yet"}
                        </p>
                      </div>
                    </div>

                    {item.primary_role && (
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                        {formatPersonRoleLabel(item.primary_role)}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.roles.map((role) => (
                      <span
                        key={role}
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          role === item.primary_role
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {formatPersonRoleLabel(role)}
                      </span>
                    ))}

                    {getSportLabelsFromValue(item.main_sport).map((sport) => (
                      <span
                        key={sport}
                        className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700"
                      >
                        {sport}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                    <p className="font-medium text-slate-900">{getIdentityContextLabel(item.roles, item.primary_role)}</p>
                    <p className="mt-2">
                      <span className="font-medium text-slate-900">Current organization:</span>{" "}
                      {item.organization_name || "Independent"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="space-y-5">
        <section className="rounded-[32px] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Discover logic</h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
            <p>
              People can now appear with clearer multi-role identity. A coach who is also
              a player is no longer forced into one flat label.
            </p>
            <p>
              Organization registration remains a top-level path, while teams,
              federations, and entities still stay linked to real human owners.
            </p>
          </div>
        </section>

        <section className="rounded-[32px] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">What comes next</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {["Public profiles", "Role-specific visibility", "Achievements", "Chat entry points"].map(
              (item) => (
                <span
                  key={item}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {item}
                </span>
              )
            )}
          </div>
        </section>
      </aside>
    </main>
  );
}

export default DiscoverPage;
