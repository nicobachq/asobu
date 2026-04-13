import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  buildRoleSelectionMap,
  formatPersonRoleLabel,
  formatRoleSummary,
  getIdentityContextLabel,
  getUniquePersonRoles,
  ORGANIZATION_REGISTRATION_OPTIONS,
  PERSON_ROLE_OPTIONS,
  type OrganizationRegistrationType,
  type PersonRole,
} from "../lib/identity";
import { getPrimarySportLabelFromValue, SPORT_REGISTRATION_OPTIONS } from "../lib/sports";
import { supabase } from "../lib/supabase";

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

function ProfilePage() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([]);

  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");
  const [mainSport, setMainSport] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<RoleSelectionState>(
    buildRoleSelectionMap(["player"])
  );
  const [primaryRole, setPrimaryRole] = useState<PersonRole>("player");

  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState<OrganizationRegistrationType>("team");
  const [orgSport, setOrgSport] = useState("");
  const [orgLocation, setOrgLocation] = useState("");
  const [orgDescription, setOrgDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [message, setMessage] = useState("");
  const [orgMessage, setOrgMessage] = useState("");

  const selectedRoleValues = useMemo(
    () =>
      PERSON_ROLE_OPTIONS.filter((option) => selectedRoles[option.value]).map(
        (option) => option.value
      ),
    [selectedRoles]
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
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error loading profile:", error.message);
      } else {
        const typedProfile = data as Profile;
        setProfile(typedProfile);
        setFullName(typedProfile.full_name || "");
        setLocation(typedProfile.location || "");
        setMainSport(typedProfile.main_sport || "");
        await loadProfileRoles(user.id, typedProfile);
      }

      await loadOrganizations(user.id);
      setLoading(false);
    }

    loadProfile();
  }, []);

  async function loadProfileRoles(userId: string, currentProfile: Profile) {
    const { data, error } = await supabase
      .from("profile_roles")
      .select("id, user_id, role, sport, is_primary, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("profile_roles unavailable, falling back to profile.role:", error.message);
      const fallbackPrimary = getUniquePersonRoles([currentProfile.role])[0] || "player";
      setSelectedRoles(buildRoleSelectionMap([fallbackPrimary]));
      setPrimaryRole(fallbackPrimary);
      return;
    }

    const typedRoles = (data as ProfileRoleRow[]) || [];
    const normalizedRoles =
      typedRoles.length > 0
        ? getUniquePersonRoles(typedRoles.map((item) => item.role))
        : getUniquePersonRoles([currentProfile.role]);

    const safeRoles: PersonRole[] = normalizedRoles.length > 0 ? normalizedRoles : ["player"];
    const primaryFromTable =
      typedRoles.find((item) => item.is_primary)?.role || currentProfile.role;
    const safePrimary = getUniquePersonRoles([primaryFromTable])[0] || safeRoles[0];

    setSelectedRoles(buildRoleSelectionMap(safeRoles));
    setPrimaryRole(safePrimary);
  }

  async function loadOrganizations(userId: string) {
    const { data, error } = await supabase
      .from("organization_members")
      .select(
        "id, organization_id, user_id, member_role, created_at, organizations(id, name, organization_type, sport, location, description, created_by, created_at)"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading organizations:", error.message);
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
          member_role: item.member_role || "member",
        };
      })
      .filter(Boolean) as OrganizationWithRole[];

    setOrganizations(mapped);
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

      return next;
    });

    setPrimaryRole((currentPrimary) => {
      if (currentPrimary === role && selectedRoles[role]) {
        const remainingRole = PERSON_ROLE_OPTIONS.find((option) => {
          if (option.value === role) return false;
          return selectedRoles[option.value];
        });

        return remainingRole?.value || "player";
      }

      return currentPrimary;
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!profileId || selectedRoleValues.length === 0) return;

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        role: primaryRole,
        location,
        main_sport: mainSport,
      })
      .eq("id", profileId);

    if (error) {
      setMessage(`Error: ${error.message}`);
      setSaving(false);
      return;
    }

    const { error: deleteRolesError } = await supabase
      .from("profile_roles")
      .delete()
      .eq("user_id", profileId);

    if (deleteRolesError) {
      console.warn("Could not replace profile_roles:", deleteRolesError.message);
    } else {
      const roleRows = selectedRoleValues.map((role) => ({
        user_id: profileId,
        role,
        sport: mainSport.trim() || null,
        is_primary: role === primaryRole,
      }));

      const { error: insertRolesError } = await supabase
        .from("profile_roles")
        .insert(roleRows);

      if (insertRolesError) {
        console.warn("Could not save profile_roles:", insertRolesError.message);
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
    setMessage("Profile updated successfully.");
    setSaving(false);
  }

  async function handleCreateOrganization(e: React.FormEvent) {
    e.preventDefault();

    if (!profileId || !orgName.trim()) return;

    setCreatingOrg(true);
    setOrgMessage("");

    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
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

    const { error: memberError } = await supabase.from("organization_members").insert({
      organization_id: orgData.id,
      user_id: profileId,
      member_role: "owner",
    });

    if (memberError) {
      setOrgMessage(`Error: ${memberError.message}`);
      setCreatingOrg(false);
      return;
    }

    setOrgName("");
    setOrgType("team");
    setOrgSport("");
    setOrgLocation("");
    setOrgDescription("");
    setOrgMessage("Organization created successfully.");

    await loadOrganizations(profileId);
    setCreatingOrg(false);
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
          <div className="h-52 bg-gradient-to-r from-blue-700 via-sky-500 to-emerald-500" />

          <div className="p-6">
            <div className="-mt-20 flex h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-slate-900 text-3xl font-semibold text-white shadow-md">
              {getInitials(profile.full_name || fullName || "Asobu User")}
            </div>

            <h1 className="mt-4 text-3xl font-bold text-slate-900">
              {profile.full_name || "No name yet"}
            </h1>

            <p className="mt-2 text-slate-600">{formatRoleSummary(selectedRoleValues, primaryRole)}</p>

            <p className="mt-1 text-slate-500">{profile.location || location || "No location yet"}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {selectedRoleValues.map((role) => (
                <span
                  key={role}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    role === primaryRole
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {formatPersonRoleLabel(role)}
                  {role === primaryRole ? " · primary" : ""}
                </span>
              ))}

              {mainSport && (
                <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
                  {getPrimarySportLabelFromValue(mainSport)}
                </span>
              )}
            </div>

            <div className="mt-6 rounded-[28px] bg-slate-50 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Identity summary</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {getIdentityContextLabel(selectedRoleValues, primaryRole)}
                  </p>
                </div>

                {profileId && (
                  <Link
                    to={`/profiles/${profileId}`}
                    className="inline-flex rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    View public profile
                  </Link>
                )}
              </div>
            </div>

            <div className="mt-8 rounded-[28px] border border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-900">Public profile structure</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Your public Asobu identity is now being shaped as a more serious sports profile. This destination will keep growing with media, achievements, sporting history, and richer discovery context.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { title: "Overview", text: "Name, identity, location, and sports context." },
                  { title: "Media", text: "Photos and short videos will become part of your public presence." },
                  { title: "Achievements", text: "Badges, recognition, and milestones will live here." },
                  { title: "Sporting history", text: "Teams, clubs, and development journey will be structured here." },
                ].map((item) => (
                  <div key={item.title} className="rounded-[24px] bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Full name</p>
                <p className="mt-2 font-semibold text-slate-900">
                  {profile.full_name || "Empty"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Primary role</p>
                <p className="mt-2 font-semibold text-slate-900">
                  {formatPersonRoleLabel(primaryRole)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Main sport</p>
                <p className="mt-2 font-semibold text-slate-900">
                  {getPrimarySportLabelFromValue(profile.main_sport || mainSport)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Edit profile</h2>

            <form onSubmit={handleSave} className="mt-6 grid grid-cols-1 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Full name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Roles
                </label>
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
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Primary role
                </label>
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
                  The primary role stays your main public identity, while the other roles
                  remain part of your deeper profile structure.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                  placeholder="Lugano, Switzerland"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Main sport
                </label>
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
                  {saving ? "Saving..." : "Save profile"}
                </button>
              </div>

              {message && <p className="text-sm text-slate-600">{message}</p>}
            </form>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Create organization</h2>

              <form onSubmit={handleCreateOrganization} className="mt-6 grid grid-cols-1 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Organization name
                  </label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                    placeholder="FC Asobu Academy"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Organization type
                  </label>
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
                    {ORGANIZATION_REGISTRATION_OPTIONS.find((option) => option.value === orgType)
                      ?.description || ""}
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Main sport
                  </label>
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
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Location
                  </label>
                  <input
                    type="text"
                    value={orgLocation}
                    onChange={(e) => setOrgLocation(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                    placeholder="Zurich, Switzerland"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Description
                  </label>
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
                    {creatingOrg ? "Creating..." : "Create organization"}
                  </button>
                </div>

                {orgMessage && <p className="text-sm text-slate-600">{orgMessage}</p>}
              </form>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-slate-900">Your organizations</h2>
                <Link
                  to="/organizations"
                  className="text-sm font-medium text-sky-700 hover:text-sky-800"
                >
                  Browse all
                </Link>
              </div>

              <div className="mt-5 space-y-3">
                {organizations.length > 0 ? (
                  organizations.map((organization) => (
                    <Link
                      key={organization.id}
                      to={`/organizations/${organization.id}`}
                      className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <div>
                        <h3 className="font-semibold text-slate-900">{organization.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {organization.organization_type} · {organization.member_role}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {organization.location || "No location"}
                        </p>
                      </div>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {getPrimarySportLabelFromValue(organization.sport)}
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">You are not part of any organization yet.</p>
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
