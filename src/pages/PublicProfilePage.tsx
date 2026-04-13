import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  formatPersonRoleLabel,
  formatRoleSummary,
  getIdentityContextLabel,
  getOpenToLabelsForRoles,
  getUniquePersonRoles,
  normalizePersonRole,
  type PersonRole,
} from "../lib/identity";
import { getPrimarySportLabelFromValue, getSportLabelsFromValue } from "../lib/sports";
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

type MediaPost = {
  id: number;
  content: string;
  image_url: string | null;
  created_at: string | null;
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

const ROLE_DESCRIPTIONS: Record<PersonRole, string> = {
  player: "Build a visible athlete identity, share media, and be discovered by coaches or scouts.",
  coach: "Represent technical leadership, player development, and team or organization context.",
  scout: "Discover talent, follow profiles, and start conversations directly inside Asobu.",
};

function PublicProfilePage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<PersonRole[]>([]);
  const [primaryRole, setPrimaryRole] = useState<PersonRole | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([]);
  const [mediaPosts, setMediaPosts] = useState<MediaPost[]>([]);
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

      const { data: mediaData, error: mediaError } = await supabase
        .from("posts")
        .select("id, content, image_url, created_at")
        .eq("user_id", id)
        .not("image_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(6);

      if (mediaError) {
        console.error("Error loading public profile media:", mediaError.message);
        setMediaPosts([]);
      } else {
        setMediaPosts((mediaData as MediaPost[]) || []);
      }

      setLoading(false);
    }

    loadPage();
  }, [id]);

  const sportLabels = useMemo(
    () => getSportLabelsFromValue(profile?.main_sport || null),
    [profile?.main_sport]
  );

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
            <Link
              to="/discover"
              className="inline-flex rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
            >
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
  const openToLabels = getOpenToLabelsForRoles(roles);
  const readinessChecks = [
    Boolean(profile.full_name?.trim()),
    Boolean(profile.location?.trim()),
    sportLabels.length > 0,
    roles.length > 0,
    organizations.length > 0,
  ];
  const readinessScore = readinessChecks.filter(Boolean).length * 20;
  const readinessLabel =
    readinessScore >= 80 ? "Strong public profile" : readinessScore >= 60 ? "Good foundation" : "Early profile";
  const strongestOrganization = organizations[0] || null;

  return (
    <main className="px-6 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-[32px] bg-white shadow-sm">
          <div className="h-64 bg-gradient-to-r from-slate-900 via-sky-700 to-emerald-500" />

          <div className="p-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="flex-1">
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
                    <span
                      key={sport}
                      className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700"
                    >
                      {sport}
                    </span>
                  ))}
                </div>
              </div>

              <div className="w-full max-w-[340px] rounded-[28px] bg-slate-50 p-5 xl:min-w-[320px]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Public profile strength</p>
                    <p className="mt-1 text-sm text-slate-500">{readinessLabel}</p>
                  </div>
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                    {readinessScore}%
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-[20px] bg-white p-4 text-center">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Roles</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{roles.length}</p>
                  </div>
                  <div className="rounded-[20px] bg-white p-4 text-center">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Sports</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{Math.max(sportLabels.length, 1)}</p>
                  </div>
                  <div className="rounded-[20px] bg-white p-4 text-center">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Orgs</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{organizations.length}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  {isOwnProfile ? (
                    <Link
                      to="/profile"
                      className="inline-flex flex-1 items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
                    >
                      Edit your profile
                    </Link>
                  ) : (
                    <Link
                      to={`/messages?with=${profile.id}`}
                      className="inline-flex flex-1 items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
                    >
                      Message on Asobu
                    </Link>
                  )}

                  <Link
                    to="/discover"
                    className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Back to discover
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="rounded-[28px] bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">About this profile</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{identityContext}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  This profile is designed to become a trusted sports identity on Asobu, combining roles, organizations, media, achievements, and communication inside one place.
                </p>
              </div>

              <div className="rounded-[28px] bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">Best fit on Asobu</p>
                <div className="mt-3 flex flex-wrap gap-2">
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
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {strongestOrganization
                    ? `${profile.full_name || "This member"} is currently most visible through ${strongestOrganization.name} on Asobu.`
                    : "Independent profiles can still be discovered, messaged, and grow their sports identity on Asobu."}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <section className="rounded-[32px] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold text-slate-900">Overview</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  Public identity
                </span>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[24px] bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Primary role</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {primaryRole ? formatPersonRoleLabel(primaryRole) : "No role yet"}
                  </p>
                </div>
                <div className="rounded-[24px] bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Main sport</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {getPrimarySportLabelFromValue(profile.main_sport)}
                  </p>
                </div>
                <div className="rounded-[24px] bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Location</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {profile.location || "Not specified"}
                  </p>
                </div>
                <div className="rounded-[24px] bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Organizations</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {organizations.length > 0 ? `${organizations.length} linked` : "Independent"}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[32px] bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900">Roles</h2>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {roles.length > 0 ? (
                  roles.map((role) => (
                    <div key={role} className="rounded-[24px] bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-slate-900">{formatPersonRoleLabel(role)}</p>
                        {role === primaryRole && (
                          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{ROLE_DESCRIPTIONS[role]}</p>
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
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold text-slate-900">Organizations</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {organizations.length}
                </span>
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
                            {organization.organization_type || "organization"} · {organization.member_role}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {organization.location || "No location yet"}
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
                    No organizations linked yet.
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[32px] bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Media spotlight</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Public images shared through posts start building the visible side of this sports identity.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {mediaPosts.length} visible
                </span>
              </div>

              {mediaPosts.length === 0 ? (
                <div className="mt-4 rounded-[24px] bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                  No public images yet. Posting photos on Asobu will gradually make this profile feel more credible and alive.
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {mediaPosts.map((post) => (
                    <div key={post.id} className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
                      {post.image_url && (
                        <img
                          src={post.image_url}
                          alt={post.content || `${profile.full_name || "Asobu member"} media`}
                          className="h-56 w-full object-cover"
                        />
                      )}
                      <div className="p-4">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                          Posted on Asobu
                        </p>
                        <p className="mt-2 line-clamp-2 text-sm text-slate-700">
                          {post.content || "Image post"}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          {post.created_at ? new Date(post.created_at).toLocaleDateString() : "Recently"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[32px] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Achievements roadmap</h2>
              <div className="mt-4 rounded-[24px] bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                Achievements, coach recognition, and milestone badges will live here. This section is intentionally structured now so the profile can become more trusted over time.
              </div>
            </section>

            <section className="rounded-[32px] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Sporting history</h2>
              <div className="mt-4 rounded-[24px] bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                Sporting history will later connect organizations, teams, milestones, and development stages into a more complete athletic journey.
              </div>
            </section>

            <section className="rounded-[32px] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Connect on Asobu</h2>
              <div className="mt-4 rounded-[24px] bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                {isOwnProfile
                  ? "Your public profile is now the destination people reach from Discover. Keep shaping it so messaging and opportunities happen in a stronger context."
                  : "If this profile looks relevant to you, start the conversation directly on Asobu and keep the relationship inside the platform."}
              </div>
              {!isOwnProfile && (
                <Link
                  to={`/messages?with=${profile.id}`}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Message this member
                </Link>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

export default PublicProfilePage;
