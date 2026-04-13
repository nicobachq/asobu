import { useMemo, useState } from "react";
import {
  buildRoleSelectionMap,
  formatPersonRoleLabel,
  formatRoleSummary,
  getIdentityContextLabel,
  getOrganizationTypeAudienceLabel,
  ORGANIZATION_REGISTRATION_OPTIONS,
  PERSON_ROLE_OPTIONS,
  type OrganizationRegistrationType,
  type PersonRole,
} from "../lib/identity";
import { SPORT_REGISTRATION_OPTIONS } from "../lib/sports";
import { supabase } from "../lib/supabase";

type SignUpPath = "person" | "organization";

type RoleSelectionState = Record<PersonRole, boolean>;

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [signUpPath, setSignUpPath] = useState<SignUpPath>("person");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");
  const [mainSport, setMainSport] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<RoleSelectionState>(
    buildRoleSelectionMap(["player"])
  );
  const [primaryRole, setPrimaryRole] = useState<PersonRole>("player");

  const [organizationName, setOrganizationName] = useState("");
  const [organizationType, setOrganizationType] =
    useState<OrganizationRegistrationType>("team");
  const [organizationSport, setOrganizationSport] = useState("");
  const [organizationLocation, setOrganizationLocation] = useState("");
  const [organizationDescription, setOrganizationDescription] = useState("");

  const selectedRoleValues = useMemo(
    () =>
      PERSON_ROLE_OPTIONS.filter((option) => selectedRoles[option.value]).map(
        (option) => option.value
      ),
    [selectedRoles]
  );

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setMessage(error.message);
        } else {
          setMessage("Logged in successfully.");
        }

        return;
      }

      if (!fullName.trim()) {
        setMessage("Please enter your full name.");
        return;
      }

      if (signUpPath === "person") {
        if (selectedRoleValues.length === 0) {
          setMessage("Please choose at least one role.");
          return;
        }

        if (!selectedRoleValues.includes(primaryRole)) {
          setMessage("Your primary role must be one of your selected roles.");
          return;
        }

        if (!mainSport.trim()) {
          setMessage("Please choose your main sport.");
          return;
        }
      }

      if (signUpPath === "organization") {
        if (!organizationName.trim()) {
          setMessage("Please enter the organization name.");
          return;
        }

        if (!organizationSport.trim()) {
          setMessage("Please choose the organization sport.");
          return;
        }
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      const userId = data.user?.id;

      if (!userId) {
        setMessage(
          "Account created. Please complete email confirmation if required, then log in."
        );
        return;
      }

      const profileRoleValue =
        signUpPath === "person" ? primaryRole : `${organizationType} owner`;

      const profileSportValue =
        signUpPath === "person" ? mainSport.trim() || null : organizationSport.trim() || null;

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: userId,
        full_name: fullName.trim(),
        role: profileRoleValue,
        location:
          signUpPath === "person"
            ? location.trim() || null
            : organizationLocation.trim() || null,
        main_sport: profileSportValue,
      });

      if (profileError) {
        setMessage(`Account created, but profile setup failed: ${profileError.message}`);
        return;
      }

      if (signUpPath === "person") {
        const roleRows = selectedRoleValues.map((role) => ({
          user_id: userId,
          role,
          sport: mainSport.trim() || null,
          is_primary: role === primaryRole,
        }));

        const { error: rolesError } = await supabase.from("profile_roles").insert(roleRows);

        if (rolesError) {
          console.warn("profile_roles setup skipped:", rolesError.message);
        }
      }

      if (signUpPath === "organization") {
        const { data: organizationData, error: organizationError } = await supabase
          .from("organizations")
          .insert({
            name: organizationName.trim(),
            organization_type: organizationType,
            sport: organizationSport.trim() || null,
            location: organizationLocation.trim() || null,
            description: organizationDescription.trim() || null,
            created_by: userId,
          })
          .select("id")
          .single();

        if (organizationError) {
          setMessage(
            `Account created, but organization setup failed: ${organizationError.message}`
          );
          return;
        }

        const { error: membershipError } = await supabase
          .from("organization_members")
          .insert({
            organization_id: organizationData.id,
            user_id: userId,
            member_role: "owner",
          });

        if (membershipError) {
          setMessage(
            `Account created, but organization membership failed: ${membershipError.message}`
          );
          return;
        }
      }

      setMessage(
        signUpPath === "person"
          ? `Account created as ${formatPersonRoleLabel(primaryRole)}.`
          : `Account and ${
              ORGANIZATION_REGISTRATION_OPTIONS.find(
                (option) => option.value === organizationType
              )?.label?.toLowerCase() || "organization"
            } created successfully.`
      );
    } catch {
      setMessage("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="px-6 py-10">
      <div className="mx-auto max-w-4xl rounded-[32px] bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {isLogin ? "Log in to Asobu" : "Create your Asobu account"}
            </h1>

            <p className="mt-3 text-sm leading-7 text-slate-500">
              Build a sports identity for players, coaches, scouts, teams, federations,
              and other sport organizations.
            </p>

            {!isLogin && (
              <>
                <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Registration path
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      {
                        key: "person",
                        label: "I am joining as a person",
                        description: "Player, coach, or scout",
                      },
                      {
                        key: "organization",
                        label: "I am registering an organization",
                        description: "Team, federation, club, entity, or community",
                      },
                    ].map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setSignUpPath(option.key as SignUpPath)}
                        className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                          signUpPath === option.key
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div className="font-medium">{option.label}</div>
                        <div
                          className={`mt-1 text-xs ${
                            signUpPath === option.key ? "text-white/75" : "text-slate-500"
                          }`}
                        >
                          {option.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6 rounded-[28px] bg-slate-50 p-5">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {signUpPath === "person" ? "Identity model" : "Organization model"}
                  </h2>
                  {signUpPath === "person" ? (
                    <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">
                      <p>
                        One account can carry more than one sports role. A coach can also
                        be a player, and that identity can become searchable later across
                        Discover.
                      </p>
                      <div className="rounded-2xl bg-white p-4 text-sm text-slate-700">
                        <p className="font-semibold text-slate-900">
                          {formatRoleSummary(selectedRoleValues, primaryRole)}
                        </p>
                        <p className="mt-1 text-slate-500">
                          {getIdentityContextLabel(selectedRoleValues, primaryRole)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">
                      <p>
                        On Asobu, organization is the umbrella for {getOrganizationTypeAudienceLabel().toLowerCase()}, but every organization still has a real human owner behind it.
                      </p>
                      <div className="rounded-2xl bg-white p-4 text-sm text-slate-700">
                        <p className="font-semibold text-slate-900">
                          {ORGANIZATION_REGISTRATION_OPTIONS.find(
                            (option) => option.value === organizationType
                          )?.label || "Organization"}
                        </p>
                        <p className="mt-1 text-slate-500">
                          {ORGANIZATION_REGISTRATION_OPTIONS.find(
                            (option) => option.value === organizationType
                          )?.description || ""}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                placeholder="••••••••"
                required
              />
            </div>

            {!isLogin && (
              <>
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
                    required={!isLogin}
                  />
                </div>

                {signUpPath === "person" ? (
                  <>
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
                        Your primary role stays the main public label, while your other
                        roles remain part of the deeper identity model.
                      </p>
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
                  </>
                ) : (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Organization name
                      </label>
                      <input
                        type="text"
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                        placeholder="FC Asobu Academy"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Organization type
                      </label>
                      <select
                        value={organizationType}
                        onChange={(e) =>
                          setOrganizationType(e.target.value as OrganizationRegistrationType)
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
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Main sport
                      </label>
                      <select
                        value={organizationSport}
                        onChange={(e) => setOrganizationSport(e.target.value)}
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
                        value={organizationLocation}
                        onChange={(e) => setOrganizationLocation(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                        placeholder="Zurich, Switzerland"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Description
                      </label>
                      <textarea
                        value={organizationDescription}
                        onChange={(e) => setOrganizationDescription(e.target.value)}
                        className="min-h-[100px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                        placeholder="Short description"
                      />
                    </div>
                  </>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? "Please wait..." : isLogin ? "Log in" : "Create account"}
            </button>
          </form>
        </div>

        {message && <p className="mt-5 text-sm text-slate-600">{message}</p>}

        <button
          type="button"
          onClick={() => {
            setIsLogin(!isLogin);
            setMessage("");
          }}
          className="mt-5 text-sm font-medium text-sky-700 hover:text-sky-800"
        >
          {isLogin ? "Need an account? Sign up" : "Already have an account? Log in"}
        </button>
      </div>
    </main>
  );
}

export default AuthPage;
