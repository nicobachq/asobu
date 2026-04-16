import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import {
  Search, Users, MapPin, Shield, Plus, Globe, Star, ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/organizations")({
  component: OrganizationsPage,
});

function OrganizationsPage() {
  const tabs = ["All", "Teams", "Clubs", "Federations", "Communities"];

  const featured = {
    name: "FC Barcelona Academy",
    type: "Club · Football",
    location: "Barcelona, ES",
    members: 342,
    desc: "One of the world's premier football academies, developing talent since 1979.",
    verified: true,
  };

  const orgs = [
    { name: "London Basketball Assoc.", type: "Federation", sport: "Basketball", location: "London, UK", members: 1250, verified: true },
    { name: "Berlin Tennis Club", type: "Club", sport: "Tennis", location: "Berlin, DE", members: 178, verified: false },
    { name: "Tokyo Athletics Federation", type: "Federation", sport: "Athletics", location: "Tokyo, JP", members: 2100, verified: true },
    { name: "Paris FC Academy", type: "Team", sport: "Football", location: "Paris, FR", members: 85, verified: true },
    { name: "Lagos Youth Basketball", type: "Community", sport: "Basketball", location: "Lagos, NG", members: 420, verified: false },
    { name: "Madrid Rugby Club", type: "Club", sport: "Rugby", location: "Madrid, ES", members: 156, verified: true },
  ];

  return (
    <AppLayout>
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground tracking-tight">Organizations</h1>
            <p className="text-[13px] text-muted-foreground mt-1">Teams, clubs, federations, and communities</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-brand text-[13px] font-semibold text-primary-foreground hover:opacity-90 transition-all">
            <Plus className="w-4 h-4" /> Create
          </button>
        </div>

        {/* Search */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search organizations..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 overflow-x-auto">
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

        {/* Featured */}
        <div className="mb-8">
          <div className="rounded-2xl border border-border bg-card p-6 cursor-pointer card-hover">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl avatar-gradient-subtle border border-primary/15 flex items-center justify-center shrink-0">
                <Globe className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-heading text-base font-semibold text-foreground">{featured.name}</h3>
                  {featured.verified && <Shield className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-[11px] text-muted-foreground mb-2">{featured.type} · {featured.location}</p>
                <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">{featured.desc}</p>
                <div className="flex items-center gap-4">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" />{featured.members} members</span>
                  <span className="text-[11px] text-warm flex items-center gap-1"><Star className="w-3 h-3 fill-warm" />Featured</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground/40 shrink-0 mt-1" />
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {orgs.map((org) => (
            <div
              key={org.name}
              className="group rounded-2xl border border-border bg-card p-5 card-hover cursor-pointer"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl avatar-gradient-subtle flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-heading text-[13px] font-semibold text-foreground truncate">{org.name}</h3>
                    {org.verified && <Shield className="w-3 h-3 text-primary shrink-0" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{org.type}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <MapPin className="w-3 h-3" /> {org.location}
                </div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-primary/8 text-primary">{org.sport}</span>
                  <span className="text-[11px] text-muted-foreground">{org.members.toLocaleString()} members</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
