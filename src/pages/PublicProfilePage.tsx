import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  formatPersonRoleLabel,
  formatRoleSummary,
  getIdentityContextLabel,
  getUniquePersonRoles,
  normalizePersonRole,
  type PersonRole,
} from "../lib/identity";
import { getSportLabelsFromValue } from "../lib/sports";
import { supabase } from "../lib/supabase";

type Profile = {
  id: string;
  full_name: string | null;
  role: string | null;
  location: string | null;
  main_sport: string | null;
  created_at: string | null;
};

type ProfileRoleRow = {
  user_id: string;
  role: string;
  sport: string | null;
  is_primary: boolean;
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

type OrganizationMembershipRow = {
  id: number;
  user_id: string;
  member_role: string | null;
  organizations: Organization | Organization[] | null;
};

type OrganizationWithRole = Organization & {
  member_role: string;
};

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

function PublicProfilePage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<PersonRole[]>([]);
  const [primaryRole, setPrimaryRole] = useState<PersonRole | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([]);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    async function loadPage() {
      if (!id) {
        setPageError("Profile not found.");
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, role, location, main_sport, created_at")
        .eq("id", id)
        .maybeSingle();

      if (profileError) {
        console.error("Error loading public profile:", profileError.message);
        setPageError(profileError.message);
        setLoading(false);
        return;
      }

      if (!profileData) {
        setPageError("Profile not found.");
        setLoading(false);
        return;
      }

      const typedProfile = profileData as Profile;
      setProfile(typedProfile);

      const { data: profileRoleData, error: profileRoleError } = await supabase
        .from("profile_roles")
        .select("user_id, role, sport, is_primary")
        .eq("user_id", id);

      if (profileRoleError) {
        console.warn("profile_roles unavailable on public profile, falling back to profile.role");
        const fallbackRoles = getUniquePersonRoles([typedProfile.role]);
        setRoles(fallbackRoles);
        setPrimaryRole(normalizePersonRole(typedProfile.role) || fallbackRoles[0] || null);
      } else {
        const typedRows = (profileRoleData as ProfileRoleRow[]) || [];
        const resolvedRoles =
          typedRows.length > 0
            ? getUniquePersonRoles(typedRows.map((row) => row.role))
            : getUniquePersonRoles([typedProfile.role]);
        const resolvedPrimary =
          normalizePersonRole(typedRows.find((row) => row.is_primary)?.role) ||
          normalizePersonRole(typedProfile.role) ||
          resolvedRoles[0] ||
          null;

        setRoles(resolvedRoles);
        setPrimaryRole(resolvedPrimary);
      }

      const { data: membershipData, error: membershipError } = await supabase
        .from("organization_members")
        .select(
          "id, user_id, member_role, organizations(id, name, organization_type, sport, location, description, logo_url, cover_image_url)"
        )
        .eq("user_id", id);

      if (membershipError) {
        console.error("Error loading public profile organizations:", membershipError.message);
        setOrganizations([]);
      } else {
        const mappedOrganizations: OrganizationWithRole[] =
          ((membershipData as OrganizationMembershipRow[]) || [])
            .map((row) => {
              const organization = firstRelation(row.organizations);
              if (!organization) return null;
              return {
                ...organization,
                member_role: row.member_role || "member",
              };
            })
            .filter(Boolean) as OrganizationWithRole[];

        setOrganizations(mappedOrganizations);
      }

      setLoading(false);
    }

    loadPage();
  }, [id]);

  const sportLabels = useMemo(() => getSportLabelsFromValue(profile?.main_sport || null), [profile?.main_sport]);

  if (loading) {
    return (
      <main className="px-6 py-6">
        <div className="mx-auto max-w-6xl rounded-[32px] bg-white p-6 shadow-sm">
          Loading profile...
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="px-6 py-6">
        <div className="mx-auto max-w-6xl rounded-[32px] bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Public profile</h1>
          <p className="mt-3 text-sm text-slate-600">{pageError || "Profile not found."}</p>
          <div className="mt-6">
            <Link to="/discover" className="inline-flex rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800">
              Back to discover
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const isOwnProfile = currentUserId === profile.id;
  const headline = formatRoleSummary(roles, primaryRole);
  const identityContext = getIdentityContextLabel(roles, primaryRole);

  return (
    <main className="px-6 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-[32px] bg-white shadow-sm">
          <div className="h-56 bg-gradient-to-r from-slate-900 via-sky-700 to-emerald-500" />

          <div className="p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="-mt-20 flex h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-slate-900 text-3xl font-semibold text-white shadow-md">
                  {getInitials(profile.full_name || "Asobu User")}
                </div>

                <h1 className="mt-4 text-3xl font-bold text-slate-900">
                  {profile.full_name || "Unnamed user"}
                </h1>
                <p className="mt-2 text-base text-slate-600">{headline}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {profile.location || "No location yet"}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {roles.map((role) => (
                    <span
                      key={role}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        role === primaryRole ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {formatPersonRoleLabel(role)}
                      {role === primaryRole ? " · primary" : ""}
                    </span>
                  ))}

                  {sportLabels.map((sport) => (
                    <span key={sport} className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
                      {sport}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {isOwnProfile ? (
                  <Link to="/profile" className="inline-flex rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800">
                    Edit your profile
                  </Link>
                ) : (
                  <Link to="/messages" className="inline-flex rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800">
                    Message on Asobu
                  </Link>
                )}

                <Link to="/discover" className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Back to discover
                </Link>
              </div>
            </div>

            <div className="mt-6 rounded-[28px] bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">Overview</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{identityContext}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                This public profile is the destination for discovery inside Asobu. It will grow into a richer sports identity with media, achievements, sporting history, and more trusted context over time.
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <section className="rounded-[32px] bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900">Roles</h2>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {roles.length > 0 ? (
                  roles.map((role) => (
                    <div key={role} className="rounded-[24px] bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Role</p>
                      <p className="mt-2 font-semibold text-slate-900">
                        {formatPersonRoleLabel(role)}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        {role === primaryRole ? "Main public sports identity" : "Secondary role inside the platform"}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[24px] bg-slate-50 p-4 text-sm text-slate-500">
                    No roles added yet.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[32px] bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900">Organizations</h2>
              <div className="mt-5 space-y-3">
                {organizations.length > 0 ? (
                  organizations.map((organization) => (
                    <Link
                      key={organization.id}
                      to={`/organizations/${organization.id}`}
                      className="flex items-start justify-between gap-4 rounded-[24px] border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <div>
                        <h3 className="font-semibold text-slate-900">{organization.name}</h3>
                        <p className="mt-1 text-sm text-slate-500 capitalize">
                          {organization.organization_type || "organization"} · {organization.member_role}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {organization.location || "No location yet"}
                        </p>
                      </div>

                      {organization.sport && (
                        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
                          {organization.sport}
                        </span>
                      )}
                    </Link>
                  ))
                ) : (
                  <div className="rounded-[24px] bg-slate-50 p-4 text-sm text-slate-500">
                    No organizations linked yet.
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[32px] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Media</h2>
              <div className="mt-4 rounded-[24px] bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                Public media will appear here. Photos and short videos are a priority for the next evolution of profile identity on Asobu.
              </div>
            </section>

            <section className="rounded-[32px] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Achievements</h2>
              <div className="mt-4 rounded-[24px] bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                Achievement badges, coach recognition, and milestone progress will live here. This section is intentionally structured now so Asobu can grow into a more trusted sports identity platform.
              </div>
            </section>

            <section className="rounded-[32px] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Sporting history</h2>
              <div className="mt-4 rounded-[24px] bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                Sporting history will later track clubs, teams, milestones, and key development stages across the user journey.
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

export default PublicProfilePage;
