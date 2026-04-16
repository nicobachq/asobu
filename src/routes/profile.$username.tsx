import { createFileRoute, Link } from "@tanstack/react-router";
import {
  MapPin, Calendar, Trophy, Star, Shield, Share2, MessageCircle,
  UserPlus, Award,
} from "lucide-react";

export const Route = createFileRoute("/profile/$username")({
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const { username } = Route.useParams();

  const skills = [
    { name: "Pace", value: 91 },
    { name: "Shooting", value: 85 },
    { name: "Passing", value: 88 },
    { name: "Dribbling", value: 93 },
    { name: "Defending", value: 40 },
    { name: "Physical", value: 72 },
  ];

  const history = [
    { org: "Real Madrid Academy", role: "Winger", period: "2024 – Present", verified: true },
    { org: "Atletico Madrid Youth", role: "Forward", period: "2022 – 2024", verified: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Public nav */}
      <header className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-md gradient-brand">
              <Trophy className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-heading text-base font-bold text-foreground">Asobu</span>
          </Link>
          <Link to="/feed" className="px-4 py-2 rounded-lg gradient-brand text-[12px] font-semibold text-primary-foreground hover:opacity-90 transition-all">
            Join Asobu
          </Link>
        </div>
      </header>

      <main className="pt-20 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Cover */}
          <div className="relative rounded-2xl h-44 md:h-56 bg-gradient-to-br from-primary/15 via-primary/5 to-warm/10 border border-border overflow-hidden mb-6">
            <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent" />
          </div>

          {/* Header */}
          <div className="flex flex-col md:flex-row gap-5 -mt-14 md:-mt-18 relative z-10 px-4 md:px-6 mb-6">
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-2xl gradient-brand flex items-center justify-center text-2xl md:text-3xl font-bold text-primary-foreground border-4 border-background shrink-0">
              {username?.[0]?.toUpperCase() || "A"}S
            </div>
            <div className="flex-1 pt-1 md:pt-8">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-heading text-2xl font-bold text-foreground">Ana Silva</h1>
                    <Shield className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-[13px] text-muted-foreground mt-0.5">@{username} · Winger · Football</p>
                  <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />Madrid, ES</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Joined 2022</span>
                    <span className="flex items-center gap-1"><Star className="w-3 h-3 text-warm" />4.8</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg gradient-brand text-[13px] font-semibold text-primary-foreground hover:opacity-90 transition-all">
                    <UserPlus className="w-4 h-4" /> Connect
                  </button>
                  <button className="p-2.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors">
                    <MessageCircle className="w-4 h-4" />
                  </button>
                  <button className="p-2.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="px-4 md:px-6 mb-6">
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Dynamic winger with exceptional pace and technical ability. Currently part of Real Madrid Academy.
              Represented Portugal at U19 level. Passionate about the beautiful game.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-4 md:px-6 mb-8">
            {[
              { label: "Followers", value: "3.4K" },
              { label: "Following", value: "218" },
              { label: "Connections", value: "156" },
              { label: "Endorsements", value: "42" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border bg-card p-3 text-center">
                <p className="font-heading text-lg font-bold text-foreground">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="grid md:grid-cols-2 gap-5 px-4 md:px-6">
            {/* History */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                <Trophy className="w-4 h-4 text-primary" /> Sporting History
              </h2>
              <div className="space-y-2.5">
                {history.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40">
                    <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                      <Award className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-medium text-foreground truncate">{item.org}</span>
                        {item.verified && <Shield className="w-3 h-3 text-primary shrink-0" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{item.role} · {item.period}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Skills */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                <Star className="w-4 h-4 text-primary" /> Skills
              </h2>
              <div className="space-y-3">
                {skills.map((skill) => (
                  <div key={skill.name} className="flex items-center gap-3">
                    <span className="text-[11px] text-muted-foreground w-16">{skill.name}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary/60" style={{ width: `${skill.value}%` }} />
                    </div>
                    <span className="text-[11px] font-medium text-foreground w-7 text-right">{skill.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Media */}
            <div className="md:col-span-2 rounded-2xl border border-border bg-card p-5">
              <h2 className="font-heading text-sm font-semibold text-foreground mb-4">Media</h2>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="aspect-square rounded-xl bg-muted/30 border border-border" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
