import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Profile = {
  id: string;
  full_name: string | null;
  role: string | null;
  location: string | null;
  main_sport: string | null;
  created_at: string | null;
};

function ProfilePage() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [mainSport, setMainSport] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

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
        setProfile(data);
        setFullName(data.full_name || "");
        setRole(data.role || "");
        setLocation(data.location || "");
        setMainSport(data.main_sport || "");
      }

      setLoading(false);
    }

    loadProfile();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!profileId) return;

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        role,
        location,
        main_sport: mainSport,
      })
      .eq("id", profileId);

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              full_name: fullName,
              role,
              location,
              main_sport: mainSport,
            }
          : prev
      );
      setMessage("Profile updated successfully.");
    }

    setSaving(false);
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
          <div className="h-48 bg-gradient-to-r from-blue-700 via-sky-500 to-emerald-500" />

          <div className="p-6">
            <div className="-mt-20 h-28 w-28 rounded-full border-4 border-white bg-slate-300 shadow-md" />

            <h1 className="mt-4 text-3xl font-bold text-slate-900">
              {profile.full_name || "No name yet"}
            </h1>

            <p className="mt-2 text-slate-600">{profile.role || "No role yet"}</p>

            <p className="mt-1 text-slate-500">
              {profile.location || "No location yet"}
            </p>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Full name</p>
                <p className="mt-2 font-semibold text-slate-900">
                  {profile.full_name || "Empty"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Role</p>
                <p className="mt-2 font-semibold text-slate-900">
                  {profile.role || "Empty"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Main sport</p>
                <p className="mt-2 font-semibold text-slate-900">
                  {profile.main_sport || "Empty"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Edit profile</h2>

          <form onSubmit={handleSave} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
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
                Role
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                placeholder="athlete, coach, founder..."
              />
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
              <input
                type="text"
                value={mainSport}
                onChange={(e) => setMainSport(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-300"
                placeholder="Football"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>

          {message && <p className="mt-4 text-sm text-slate-600">{message}</p>}
        </section>
      </div>
    </main>
  );
}

export default ProfilePage;