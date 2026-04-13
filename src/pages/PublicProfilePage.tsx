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
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="animate-pulse space-y-4">
            <div className="h-48 rounded-2xl bg-slate-200" />
            <div className="h-6 w-48 rounded bg-slate-200" />
            <div className="h-4 w-32 rounded bg-slate-200" />
          </div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Profile not found</h1>
          <p className="mt-3 text-slate-500">{pageError || "This profile doesn't exist."}</p>
          <Link
            to="/discover"
            className="mt-8 inline-flex rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
          >
            Back to discover
          </Link>
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
    readinessScore >= 80 ? "Strong" : readinessScore >= 60 ? "Good" : "Early";
  const strongestOrganization = organizations[0] || null;

  return (
    <main className="min-h-screen bg-slate-50/80">
      {/* ───── HERO ───── */}
      <div className="relative">
        <div className="h-56 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 sm:h-64 lg:h-72" />

        <div className="mx-auto max-w-5xl px-6">
          <div className="relative -mt-16 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            {/* Avatar + Name */}
            <div className="flex items-end gap-5">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-slate-900 text-3xl font-bold text-white shadow-lg sm:h-32 sm:w-32">
                {getInitials(profile.full_name || "Asobu User")}
              </div>
              <div className="pb-1 hidden sm:block">
                <h1 className="text-2xl font-bold text-slate-900 lg:text-3xl">
                  {profile.full_name || "Unnamed user"}
                </h1>
                <p className="mt-1 text-base text-slate-500">{headline}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pb-1">
              {isOwnProfile ? (
                <Link
                  to="/profile"
                  className="inline-flex items-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                >
                  Edit profile
                </Link>
              ) : (
                <Link
                  to={`/messages?with=${profile.id}`}
                  className="inline-flex items-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                >
                  Message
                </Link>
              )}
              <Link
                to="/discover"
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Discover
              </Link>
            </div>
          </div>

          {/* Mobile name (below avatar) */}
          <div className="mt-4 sm:hidden">
            <h1 className="text-2xl font-bold text-slate-900">
              {profile.full_name || "Unnamed user"}
            </h1>
            <p className="mt-1 text-base text-slate-500">{headline}</p>
          </div>

          {/* Tags row */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {roles.map((role) => (
              <span
                key={role}
                className={`rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase ${
                  role === primaryRole
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {formatPersonRoleLabel(role)}
              </span>
            ))}
            {sportLabels.map((sport) => (
              <span
                key={sport}
                className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold tracking-wide uppercase text-sky-700"
              >
                {sport}
              </span>
            ))}
            {profile.location && (
              <span className="text-xs text-slate-400">
                ·&nbsp;&nbsp;{profile.location}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ───── BODY ───── */}
      <div className="mx-auto max-w-5xl px-6 pb-20">
        {/* ── MEDIA (hero position — most prominent) ── */}
        <section className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Media</h2>
            <span className="text-xs font-medium text-slate-400">
              {mediaPosts.length} {mediaPosts.length === 1 ? "post" : "posts"}
            </span>
          </div>

          {mediaPosts.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
              <p className="text-sm text-slate-400">
                No media yet — posts with images will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {mediaPosts.map((post, i) => (
                <div
                  key={post.id}
                  className={`group relative overflow-hidden rounded-2xl bg-slate-200 ${
                    i === 0 ? "col-span-2 row-span-2" : ""
                  }`}
                >
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt={post.content || `${profile.full_name || "Asobu member"} media`}
                      className={`w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] ${
                        i === 0 ? "h-72 sm:h-96" : "h-44 sm:h-52"
                      }`}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
                    <p className="text-xs font-medium text-white line-clamp-2">
                      {post.content || "Image post"}
                    </p>
                    <p className="mt-0.5 text-[10px] text-white/70">
                      {post.created_at ? new Date(post.created_at).toLocaleDateString() : "Recently"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── SNAPSHOT ROW ── */}
        <section className="mt-12">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Primary role</p>
              <p className="mt-2 text-lg font-bold text-slate-900">
                {primaryRole ? formatPersonRoleLabel(primaryRole) : "—"}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Main sport</p>
              <p className="mt-2 text-lg font-bold text-slate-900">
                {getPrimarySportLabelFromValue(profile.main_sport)}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Organizations</p>
              <p className="mt-2 text-lg font-bold text-slate-900">
                {organizations.length > 0 ? organizations.length : "—"}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Profile</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{readinessScore}%</p>
              <p className="text-xs text-slate-400">{readinessLabel}</p>
            </div>
          </div>
        </section>

        {/* ── TWO-COLUMN: LEFT content / RIGHT sidebar ── */}
        <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_300px]">
          {/* LEFT */}
          <div className="space-y-10">
            {/* About */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900">About</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{identityContext}</p>
              {openToLabels.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {openToLabels.map((item) => (
                    <span key={item} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* Roles */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900">Roles</h2>
              {roles.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {roles.map((role) => (
                    <div
                      key={role}
                      className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600 uppercase">
                        {role[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">{formatPersonRoleLabel(role)}</p>
                          {role === primaryRole && (
                            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white uppercase tracking-wider">
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{ROLE_DESCRIPTIONS[role]}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-400">No roles added yet.</p>
              )}
            </section>

            {/* Organizations */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900">Organizations</h2>
              {organizations.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {organizations.map((org) => (
                    <Link
                      key={org.id}
                      to={`/organizations/${org.id}`}
                      className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white overflow-hidden">
                        {org.logo_url ? (
                          <img src={org.logo_url} alt={org.name} className="h-full w-full object-contain p-1" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white">
                            {getInitials(org.name)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">{org.name}</p>
                        <p className="mt-0.5 text-xs text-slate-400 capitalize">
                          {org.organization_type || "Organization"} · {org.member_role}
                          {org.location ? ` · ${org.location}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-semibold text-sky-700 uppercase tracking-wider">
                        {getPrimarySportLabelFromValue(org.sport)}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-400">No organizations linked yet.</p>
              )}
            </section>

            {/* Sporting History */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900">Sporting history</h2>
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
                <p className="text-sm text-slate-400">
                  Timeline of teams, milestones, and development stages — coming soon.
                </p>
              </div>
            </section>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="space-y-6">
            {/* Achievements */}
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Achievements</h3>
              <div className="mt-3 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center">
                <p className="text-xs text-slate-400">Badges and recognition will appear here.</p>
              </div>
            </div>

            {/* Strongest affiliation */}
            {strongestOrganization && (
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">Primary affiliation</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Most visible through <span className="font-medium text-slate-700">{strongestOrganization.name}</span>
                </p>
              </div>
            )}

            {/* CTA */}
            <div className="rounded-2xl bg-slate-900 p-5 text-white">
              <h3 className="text-sm font-semibold">Connect on Asobu</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                {isOwnProfile
                  ? "This is your public profile — keep shaping it to attract opportunities."
                  : "Interested? Start a conversation directly on the platform."}
              </p>
              {!isOwnProfile && (
                <Link
                  to={`/messages?with=${profile.id}`}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
                >
                  Message this member
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default PublicProfilePage;
