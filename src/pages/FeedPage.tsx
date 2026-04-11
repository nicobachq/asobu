import ProfileCard from "../components/ProfileCard";
import FeedCard from "../components/FeedCard";
import SuggestionsCard from "../components/SuggestionsCard";

function FeedPage() {
  const profile = {
    name: "Nicolas Bachmann",
    role: "Player / Founder",
    location: "Lugano, Switzerland",
    sports: ["Football", "Padel", "Tennis"],
    organization: "Asobu Community",
    openTo: ["Teams", "Clubs", "Communities"],
  };

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
    <main className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-6 py-6 lg:grid-cols-[280px_1fr_280px]">
      <ProfileCard profile={profile} />
      <FeedCard posts={posts} />
      <SuggestionsCard suggestions={suggestions} />
    </main>
  );
}

export default FeedPage;