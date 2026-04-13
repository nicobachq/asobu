import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import Navbar from "./components/Navbar";
import FeedPage from "./pages/FeedPage";
import DiscoverPage from "./pages/DiscoverPage";
import ProfilePage from "./pages/ProfilePage";
import PublicProfilePage from "./pages/PublicProfilePage";
import MessagesPage from "./pages/MessagesPage";
import AuthPage from "./pages/AuthPage";
import OrganizationPage from "./pages/OrganizationPage";
import OrganizationsListPage from "./pages/OrganizationsListPage";
import { normalizePersonRole } from "./lib/identity";
import { supabase } from "./lib/supabase";

type MinimalProfile = {
  id: string;
  full_name: string | null;
  role: string | null;
  location: string | null;
  main_sport: string | null;
};

type ProfileRoleRow = {
  id: number;
};

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function ensureProfileAndRoles() {
      if (!session?.user) return;

      const userId = session.user.id;
      const email = session.user.email ?? "";

      const { data: existingProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("id, full_name, role, location, main_sport")
        .eq("id", userId)
        .maybeSingle();

      if (fetchError) {
        console.error("Error checking profile:", fetchError.message);
        return;
      }

      let profile: MinimalProfile;

      if (!existingProfile) {
        const fallbackName = email ? email.split("@")[0] : "New User";

        const { error: insertError } = await supabase.from("profiles").insert({
          id: userId,
          full_name: fallbackName,
          role: "player",
          location: "",
          main_sport: "",
        });

        if (insertError) {
          console.error("Error creating profile:", insertError.message);
          return;
        }

        profile = {
          id: userId,
          full_name: fallbackName,
          role: "player",
          location: "",
          main_sport: "",
        };
      } else {
        profile = existingProfile as MinimalProfile;
      }

      const normalizedPrimaryRole = normalizePersonRole(profile.role);

      if (!normalizedPrimaryRole) {
        return;
      }

      const { data: existingRoles, error: rolesError } = await supabase
        .from("profile_roles")
        .select("id")
        .eq("user_id", userId)
        .limit(1);

      if (rolesError) {
        console.warn("profile_roles not ready yet or unavailable:", rolesError.message);
        return;
      }

      if (((existingRoles as ProfileRoleRow[]) || []).length > 0) {
        return;
      }

      const { error: insertRoleError } = await supabase.from("profile_roles").insert({
        user_id: userId,
        role: normalizedPrimaryRole,
        sport: profile.main_sport?.trim() || null,
        is_primary: true,
      });

      if (insertRoleError) {
        console.warn("Could not create default profile role:", insertRoleError.message);
      }
    }

    ensureProfileAndRoles();
  }, [session]);

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-700">
        Loading...
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Navbar onLogout={handleLogout} />

      <Routes>
        <Route path="/" element={<FeedPage />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profiles/:id" element={<PublicProfilePage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/organizations" element={<OrganizationsListPage />} />
        <Route path="/organizations/:id" element={<OrganizationPage />} />
      </Routes>
    </div>
  );
}

export default App;
