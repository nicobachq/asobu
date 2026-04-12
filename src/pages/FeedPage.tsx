import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import ProfileCard from "../components/ProfileCard";
import FeedCard from "../components/FeedCard";
import SuggestionsCard from "../components/SuggestionsCard";

type DbProfile = {
  id: string;
  full_name: string | null;
  role: string | null;
  location: string | null;
  main_sport: string | null;
};

function FeedPage() {
  const [profile, setProfile] = useState({
    name: "Loading...",
    role: "Loading...",
    location: "Loading...",
    sports: [] as string[],
    organization: "No organization yet",
    openTo: ["Teams", "Clubs", "Communities"],
  });

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single<DbProfile>();

      if (error) {
        console.error("Error loading feed profile:", error.message);
        return;
      }

      setProfile({
        name: data.full_name || "No name yet",
        role: data.role || "No role yet",
        location: data.location || "No location yet",
        sports: data.main_sport ? [data.main_sport] : [],
        organization: "No organization yet",
        openTo: ["Teams", "Clubs", "Communities"],
      });
    }

    loadProfile();
  }, []);

  const posts = [
    {
      id: 1,
      author: "Luca Bianchi",
      meta: "Football Player · 2h",
      content:
        "Great match today. Happy with the result and the team spirit. Looking forward to the next game.",
    },
    {
      id: 2,
      author: "Padel Brothers Ticino",
      meta: "Community · 5h",
      content:
        "New community session this Sunday in Lugano. Open to players of different levels.",
    },
    {
      id: 3,
      author: "Coach Elena Rossi",
      meta: "Volleyball Coach · 8h",
      content:
        "Looking for disciplined young athletes with strong attitude and good game intelligence.",
    },
  ];

  const suggestions = [
    {
      id: 1,
      name: "FC Lugano U21",
      meta: "Football Team · Lugano",
    },
    {
      id: 2,
      name: "Padel Brothers Ticino",
      meta: "Community · Lugano",
    },
    {
      id: 3,
      name: "Coach Elena Rossi",
      meta: "Volleyball Coach · Switzerland",
    },
  ];

  return (
    <main className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-6 py-6 lg:grid-cols-[290px_minmax(0,1fr)_280px]">
      <ProfileCard profile={profile} />
      <FeedCard posts={posts} />
      <SuggestionsCard suggestions={suggestions} />
    </main>
  );
}

export default FeedPage;