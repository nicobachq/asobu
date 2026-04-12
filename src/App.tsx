import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import Navbar from "./components/Navbar";
import FeedPage from "./pages/FeedPage";
import ProfilePage from "./pages/ProfilePage";
import MessagesPage from "./pages/MessagesPage";
import AuthPage from "./pages/AuthPage";
import OrganizationPage from "./pages/OrganizationPage";
import { supabase } from "./lib/supabase";

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
    async function ensureProfile() {
      if (!session?.user) return;

      const userId = session.user.id;
      const email = session.user.email ?? "";

      const { data: existingProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (fetchError) {
        console.error("Error checking profile:", fetchError.message);
        return;
      }

      if (!existingProfile) {
        const fallbackName = email ? email.split("@")[0] : "New User";

        const { error: insertError } = await supabase.from("profiles").insert({
          id: userId,
          full_name: fallbackName,
          role: "athlete",
          location: "",
          main_sport: "",
        });

        if (insertError) {
          console.error("Error creating profile:", insertError.message);
        }
      }
    }

    ensureProfile();
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
      <Navbar />

      <div className="mx-auto flex max-w-7xl justify-end px-6 pt-4">
        <button
          onClick={handleLogout}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Log out
        </button>
      </div>

      <Routes>
        <Route path="/" element={<FeedPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/organizations/:id" element={<OrganizationPage />} />
      </Routes>
    </div>
  );
}

export default App;