import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Search, Filter, MapPin, Star, ChevronDown, Shield, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/discover")({
  component: DiscoverPage,
});

function DiscoverPage() {
  const tabs = ["All", "Players", "Coaches", "Scouts", "Organizations"];
  const sports = ["Football", "Basketball", "Tennis", "Padel", "Athletics", "Rugby"];

  const featured = [
    { name: "Ana Silva", role: "Winger · Football", location: "Madrid, ES", rating: 4.8, avatar: "AS", verified: true, stat: "91 Pace" },
    { name: "James Chen", role: "Point Guard · Basketball", location: "London, UK", rating: 4.6, avatar: "JC", verified: true, stat: "88 Court Vision" },
  ];

  const profiles = [
    { name: "Elena Popov", role: "Coach", sport: "Tennis", location: "Berlin, DE", rating: 4.9, avatar: "EP", verified: false },
    { name: "Marcus Reed", role: "Goalkeeper", sport: "Football", location: "Paris, FR", rating: 4.5, avatar: "MR", verified: true },
    { name: "Yuki Tanaka", role: "Sprinter", sport: "Athletics", location: "Tokyo, JP", rating: 4.7, avatar: "YT", verified: false },
    { name: "David Okafor", role: "Center", sport: "Basketball", location: "Lagos, NG", rating: 4.4, avatar: "DO", verified: true },
    { name: "Sophie Laurent", role: "Midfielder", sport: "Football", location: "Lyon, FR", rating: 4.6, avatar: "SL", verified: true },
    { name: "Rafael Costa", role: "Scout", sport: "Football", location: "Barcelona, ES", rating: 4.8, avatar: "RC", verified: true },
  ];

  return (
    <AppLayout>
      <div>
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-bold text-foreground tracking-tight">Discover</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Find athletes, coaches, scouts, and organizations</p>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, sport, position..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
            <Filter className="w-4 h-4" /> Filters <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto">
          {tabs.map((tab, i) => (
            <button
              key={tab}
              className={`px-4 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition-all ${
                i === 0
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Sport pills */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          {sports.map((sport, i) => (
            <button
              key={sport}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all border ${
                i === 0
                  ? "border-primary/30 bg-primary/8 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {sport}
            </button>
          ))}
        </div>

        {/* Featured */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-warm" />
            <h2 className="font-heading text-sm font-semibold text-foreground">Featured Athletes</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {featured.map((profile) => (
              <div
                key={profile.name}
                className="group relative rounded-2xl border border-border bg-card p-5 card-hover cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl avatar-gradient flex items-center justify-center text-sm font-bold text-primary-foreground">
                    {profile.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-heading text-sm font-semibold text-foreground truncate">{profile.name}</h3>
                      {profile.verified && <Shield className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{profile.role}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{profile.location}</span>
                      <span className="text-[10px] font-medium text-primary">{profile.stat}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="w-3 h-3 text-warm fill-warm" />
                    {profile.rating}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {profiles.map((profile) => (
            <div
              key={profile.name}
              className="group rounded-2xl border border-border bg-card p-5 card-hover cursor-pointer"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-11 h-11 rounded-full avatar-gradient flex items-center justify-center text-[11px] font-semibold text-primary-foreground">
                  {profile.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-heading text-[13px] font-semibold text-foreground truncate">{profile.name}</h3>
                    {profile.verified && <Shield className="w-3 h-3 text-primary shrink-0" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{profile.role}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <MapPin className="w-3 h-3" /> {profile.location}
                </div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-primary/8 text-primary">{profile.sport}</span>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Star className="w-3 h-3 text-warm fill-warm" /> {profile.rating}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
