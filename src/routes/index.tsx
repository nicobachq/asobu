import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Trophy, Compass, Users, Shield, ArrowRight, Star, Zap,
  Globe, ChevronRight, User, Target, Award, MapPin,
  Eye, BarChart3, Gamepad2, Search, Video, TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "Asobu — Play. Grow. Be Seen." },
      { name: "description", content: "The AI-powered platform empowering amateur and semi-pro athletes worldwide to build connections, share moments, and elevate their game." },
      { property: "og:title", content: "Asobu — Play. Grow. Be Seen." },
      { property: "og:description", content: "A new LinkedIn for sport. Build your sports identity, get discovered, and unlock opportunities." },
    ],
  }),
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background font-body">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg gradient-brand">
              <Trophy className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-heading text-lg font-bold text-foreground tracking-tight">
              Asobu
            </span>
            <span className="hidden sm:inline text-[10px] text-muted-foreground ml-1 tracking-wide">遊ぶ</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#problem" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">The Problem</a>
            <a href="#solution" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">Solution</a>
            <a href="#features" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">Features</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/feed" className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link to="/feed" className="inline-flex items-center gap-2 px-5 py-2 rounded-lg gradient-brand text-[13px] font-semibold text-primary-foreground transition-all hover:opacity-90">
              Get Started <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero — dark navy band */}
      <section className="relative pt-28 pb-24 px-6 overflow-hidden gradient-hero">
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[150px]" />
        <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] rounded-full bg-warm/6 blur-[120px]" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm mb-10">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] font-medium text-white/70 tracking-wide uppercase">A new LinkedIn for sport</span>
          </div>

          <h1 className="font-heading text-5xl sm:text-6xl md:text-[4.5rem] font-bold text-white leading-[1.08] tracking-tight mb-7">
            Play. Grow.{" "}
            <br className="hidden sm:block" />
            <span className="text-gradient-brand">Be Seen</span>.
          </h1>

          <p className="text-base md:text-lg text-white/60 max-w-2xl mx-auto mb-12 leading-relaxed">
            The AI-powered platform empowering amateur and semi-pro athletes worldwide
            to build connections, share moments, and elevate their game.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/feed" className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl gradient-brand text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 glow-brand">
              Create Your Identity <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/discover" className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm text-sm font-medium text-white hover:bg-white/10 transition-all">
              Explore Athletes
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="max-w-4xl mx-auto mt-20 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-white/10 bg-white/5">
            {[
              { value: "3B+", label: "Amateur Athletes", icon: User },
              { value: "85+", label: "Sports Covered", icon: Target },
              { value: "Multi", label: "Sport Platform", icon: Globe },
              { value: "AI", label: "Powered Discovery", icon: Zap },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/5 backdrop-blur-sm px-6 py-6 text-center">
                <stat.icon className="w-4 h-4 text-primary/70 mx-auto mb-2.5" />
                <p className="font-heading text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-[11px] text-white/50 mt-1 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem section — white */}
      <section id="problem" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-warm/20 bg-warm/5 mb-6">
              <Eye className="w-3 h-3 text-warm" />
              <span className="text-[11px] font-medium text-warm uppercase tracking-wide">The Problem</span>
            </div>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
              A World of Missed Opportunities
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Across 3 billion+ amateur and semi-pro athletes, talent is abundant — but visibility is scarce.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Search, title: "No Central Platform", desc: "Without a unified space, most players go unseen by scouts, coaches, or fans." },
              { icon: Video, title: "No Performance Trail", desc: "Important moments are lost. Athletes have no portfolio to track or share progress." },
              { icon: Zap, title: "Fragmented Tools", desc: "Players use different apps for video, data, and communication. None work together." },
              { icon: BarChart3, title: "No Smart Analytics", desc: "Pros use advanced insights to grow. Amateurs have none — limiting development." },
              { icon: TrendingUp, title: "No Brand Access", desc: "No channel for brands or sponsors to connect with authentic local talent." },
              { icon: Users, title: "Less Engagement", desc: "Lack of interaction leads to less competitiveness, less community, less fun." },
            ].map((item) => (
              <div key={item.title} className="p-5 rounded-2xl border border-border bg-card elevation-1 hover:elevation-2 transition-all">
                <div className="w-10 h-10 rounded-xl bg-warm/8 flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-warm" />
                </div>
                <h3 className="font-heading text-[15px] font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution — light teal band */}
      <section id="solution" className="py-24 px-6 bg-primary/3">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 mb-6">
                <Award className="w-3 h-3 text-primary" />
                <span className="text-[11px] font-medium text-primary uppercase tracking-wide">The Solution</span>
              </div>
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground leading-tight mb-5">
                One Platform to Play, Grow,{" "}
                <span className="text-gradient-brand">and Be Seen</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Asobu is a smart, AI-powered platform that transforms every athlete's journey
                into a visible, connected, and data-rich experience — built for motivation,
                discovery, and growth.
              </p>
              <div className="space-y-5">
                {[
                  { label: "Unified Profiles & Integrations", desc: "Combine video highlights, stats, and wearable data from Veo, Strava, Garmin, Whoop." },
                  { label: "Discovery & Community", desc: "AI helps scouts, coaches, and sponsors find emerging talent." },
                  { label: "Gamified Progression", desc: "Challenges, milestones, and leaderboards keep athletes engaged at every level." },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Identity card */}
            <div className="relative">
              <div className="rounded-2xl border border-border bg-card p-6 elevation-2">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 rounded-xl gradient-brand flex items-center justify-center text-lg font-bold text-primary-foreground">AS</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading text-base font-semibold text-foreground">Ana Silva</h3>
                      <Shield className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground">Winger · Football</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> Madrid, ES
                    </p>
                  </div>
                </div>
                <div className="space-y-2.5 mb-5">
                  {[
                    { name: "Pace", value: 91 },
                    { name: "Dribbling", value: 93 },
                    { name: "Shooting", value: 85 },
                  ].map((s) => (
                    <div key={s.name} className="flex items-center gap-3">
                      <span className="text-[11px] text-muted-foreground w-16">{s.name}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary/70" style={{ width: `${s.value}%` }} />
                      </div>
                      <span className="text-[11px] font-medium text-foreground w-6 text-right">{s.value}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-primary/10 text-[10px] font-medium text-primary">Real Madrid Academy</span>
                  <span className="px-2 py-0.5 rounded-md bg-warm/10 text-[10px] font-medium text-warm">U19 Portugal</span>
                </div>
              </div>
              <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full bg-primary/6 blur-[60px]" />
            </div>
          </div>
        </div>
      </section>

      {/* Magic / Story */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-warm/20 bg-warm/5 mb-6">
            <Star className="w-3 h-3 text-warm" />
            <span className="text-[11px] font-medium text-warm uppercase tracking-wide">The Magic of Asobu</span>
          </div>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-6">
            From Oven to Opportunity
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
            Abdulai Juma Bah was a young baker with hidden talent until the right eyes found him.
            Today, he plays at Manchester City F.C. — Asobu gives every athlete the tools to be
            seen and supported.
          </p>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { icon: Eye, label: "Visibility", desc: "Be seen by scouts, coaches, and sponsors worldwide" },
              { icon: Globe, label: "Connection", desc: "Build your network across sports, countries, and levels" },
              { icon: TrendingUp, label: "Growth", desc: "Track progress with AI insights and gamified milestones" },
            ].map((item) => (
              <div key={item.label} className="p-5 rounded-2xl border border-border bg-card elevation-1">
                <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center mb-3 mx-auto">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-heading text-sm font-semibold text-foreground mb-1">{item.label}</h3>
                <p className="text-[12px] text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-muted/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything for Your Sports Career
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Build your verified identity, connect with the right people, and take control of your trajectory.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: User, title: "Sports Identity", desc: "Build a rich profile with your sporting history, positions, skills, and media." },
              { icon: Compass, title: "Discovery Engine", desc: "AI-powered search by sport, position, location, and level." },
              { icon: Users, title: "Organizations", desc: "Teams, clubs, federations — managed with rosters and events." },
              { icon: Shield, title: "Verified History", desc: "Link your history to real organizations with verifiable records." },
              { icon: Gamepad2, title: "Gamification", desc: "Challenges, badges, leaderboards — stay motivated every session." },
              { icon: Globe, title: "Multi-Sport", desc: "Football, basketball, volleyball, tennis, combat sports — one platform." },
            ].map((feature) => (
              <div key={feature.title} className="group p-6 rounded-2xl border border-border bg-card hover:elevation-2 transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center mb-4 group-hover:bg-primary/12 transition-colors">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-heading text-[15px] font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ecosystem */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
              A Connected Ecosystem
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Asobu combines everything athletes, coaches, scouts, and organizations need.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { role: "Athletes", desc: "Build your profile, track progress, get discovered", icon: User },
              { role: "Coaches", desc: "Manage teams, analyze performance, find talent", icon: Trophy },
              { role: "Scouts", desc: "AI-driven tools to identify emerging talent", icon: Search },
              { role: "Organizations", desc: "Run clubs, leagues, and federations efficiently", icon: Users },
            ].map((item) => (
              <div key={item.role} className="p-5 rounded-2xl border border-border bg-card text-center elevation-1">
                <div className="w-12 h-12 rounded-xl bg-primary/8 flex items-center justify-center mb-3 mx-auto">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-heading text-sm font-semibold text-foreground mb-1">{item.role}</h3>
                <p className="text-[12px] text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — dark navy band */}
      <section className="py-24 px-6 gradient-hero">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Elevate Your Game?
          </h2>
          <p className="text-white/60 mb-10 max-w-md mx-auto">
            Join the platform that makes amateur sports more competitive, more visible, and more fun.
          </p>
          <Link to="/feed" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl gradient-brand text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 glow-brand">
            Get Started Free <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-md gradient-brand">
              <Trophy className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-heading text-base font-bold text-foreground">Asobu</span>
            <span className="text-[10px] text-muted-foreground">遊ぶ — to play</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 Asobu. All rights reserved. · contact@asobu.io</p>
        </div>
      </footer>
    </div>
  );
}
