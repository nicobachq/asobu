import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  buildRoleSelectionMap,
  formatPersonRoleLabel,
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
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get("mode") !== "signup");
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

  useEffect(() => {
    setIsLogin(searchParams.get("mode") !== "signup");
  }, [searchParams]);

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
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link to="/" className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
            Asobu
          </Link>
          <Link
            to="/"
            className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            ← Back to homepage
          </Link>
        </div>

        <div className="mx-auto max-w-2xl rounded-[32px] bg-white p-5 shadow-sm sm:p-6 lg:p-7">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-[2rem]">
            {isLogin ? "Log in" : "Create account"}
          </h1>

          {!isLogin ? (
            <div className="mt-5 flex flex-wrap gap-2 rounded-[24px] bg-slate-50 p-2 ring-1 ring-slate-200/70">
              {[
                { key: "person", label: "Person" },
                { key: "organization", label: "Organization" },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSignUpPath(option.key as SignUpPath)}
                  className={[
                    'rounded-2xl px-4 py-3 text-sm font-medium transition',
                    signUpPath === option.key
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white text-slate-700 hover:bg-slate-100',
                  ].join(' ')}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-slate-300"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-slate-300"
                placeholder="••••••••"
                required
              />
            </div>

            {!isLogin ? (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Full name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-slate-300"
                    placeholder="Your full name"
                    required={!isLogin}
                  />
                </div>

                {signUpPath === "person" ? (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Roles</label>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {PERSON_ROLE_OPTIONS.map((option) => (
                          <label
                            key={option.value}
                            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
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

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Primary role</label>
                        <select
                          value={primaryRole}
                          onChange={(e) => setPrimaryRole(e.target.value as PersonRole)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-slate-300"
                        >
                          {selectedRoleValues.map((role) => (
                            <option key={role} value={role}>
                              {formatPersonRoleLabel(role)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Main sport</label>
                        <select
                          value={mainSport}
                          onChange={(e) => setMainSport(e.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-slate-300"
                        >
                          <option value="">Choose a sport</option>
                          {SPORT_REGISTRATION_OPTIONS.map((sport) => (
                            <option key={sport.value} value={sport.label}>
                              {sport.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Location</label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-slate-300"
                        placeholder="Lugano, Switzerland"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Organization name</label>
                      <input
                        type="text"
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-slate-300"
                        placeholder="FC Asobu Academy"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Organization type</label>
                        <select
                          value={organizationType}
                          onChange={(e) => setOrganizationType(e.target.value as OrganizationRegistrationType)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-slate-300"
                        >
                          {ORGANIZATION_REGISTRATION_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Main sport</label>
                        <select
                          value={organizationSport}
                          onChange={(e) => setOrganizationSport(e.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-slate-300"
                        >
                          <option value="">Choose a sport</option>
                          {SPORT_REGISTRATION_OPTIONS.map((sport) => (
                            <option key={sport.value} value={sport.label}>
                              {sport.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Location</label>
                      <input
                        type="text"
                        value={organizationLocation}
                        onChange={(e) => setOrganizationLocation(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-slate-300"
                        placeholder="Zurich, Switzerland"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Description</label>
                      <textarea
                        value={organizationDescription}
                        onChange={(e) => setOrganizationDescription(e.target.value)}
                        className="min-h-[100px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-slate-300"
                        placeholder="Short description"
                      />
                    </div>
                  </>
                )}
              </>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary min-h-[52px] w-full"
            >
              {loading ? "Please wait..." : isLogin ? "Log in" : "Create account"}
            </button>

            {isLogin ? (
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className="btn-secondary min-h-[52px] w-full"
              >
                Need an account? Sign up
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className="w-full text-center text-sm font-medium text-slate-600 transition hover:text-slate-900"
              >
                Already have an account? Log in
              </button>
            )}

            {message ? <p className="text-sm text-slate-600">{message}</p> : null}
          </form>
        </div>
      </div>
    </main>
  )
}

export default AuthPage;
