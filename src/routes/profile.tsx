import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PlayerCard } from "@/components/PlayerCard";
import { calcOVR, levelFromXP, tierFor, attrTierClass, type Attribute } from "@/lib/player";
import {
  Edit3, MapPin, Calendar, Trophy, Shield, Camera, Share2,
  Plus, Award, Eye, TrendingUp, TrendingDown, Flame, Target,
  Zap, Crown, Medal, Lock, ChevronRight, Activity,
} from "lucide-react";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

/* ---------- Radar with tier-colored fill ---------- */
function RadarChart({ attributes, ovr }: { attributes: Attribute[]; ovr: number }) {
  const cx = 150, cy = 150, r = 105;
  const n = attributes.length;
  const tier = tierFor(ovr);

  const tierStroke =
    tier.key === "world" ? "oklch(0.55 0.25 305)" :
    tier.key === "elite" ? "oklch(0.55 0.14 190)" :
    tier.key === "gold"  ? "oklch(0.72 0.16 80)" :
    tier.key === "silver" ? "oklch(0.55 0.02 240)" :
                            "oklch(0.55 0.13 50)";

  const getPoint = (i: number, val: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const dist = (val / 100) * r;
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  };

  const rings = [25, 50, 75, 100];

  return (
    <svg viewBox="0 0 300 300" className="w-full max-w-[280px] mx-auto">
      <defs>
        <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={tierStroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={tierStroke} stopOpacity="0.08" />
        </radialGradient>
      </defs>

      {rings.map((ring) => (
        <polygon
          key={ring}
          points={Array.from({ length: n }, (_, i) => {
            const p = getPoint(i, ring);
            return `${p.x},${p.y}`;
          }).join(" ")}
          fill="none"
          stroke="oklch(0.91 0.006 240)"
          strokeWidth="1"
          strokeDasharray={ring === 100 ? "0" : "2 3"}
        />
      ))}
      {attributes.map((_, i) => {
        const p = getPoint(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="oklch(0.91 0.006 240)" strokeWidth="1" />;
      })}
      <polygon
        points={attributes.map((a, i) => {
          const p = getPoint(i, a.value);
          return `${p.x},${p.y}`;
        }).join(" ")}
        fill="url(#radarFill)"
        stroke={tierStroke}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {attributes.map((a, i) => {
        const p = getPoint(i, a.value);
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="5" fill="white" stroke={tierStroke} strokeWidth="2" />
            <circle cx={p.x} cy={p.y} r="2" fill={tierStroke} />
          </g>
        );
      })}
      {attributes.map((a, i) => {
        const p = getPoint(i, 118);
        return (
          <g key={`l-${i}`}>
            <text
              x={p.x}
              y={p.y - 4}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground text-[13px] font-bold"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {a.value}
            </text>
            <text
              x={p.x}
              y={p.y + 8}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted-foreground text-[9px] font-semibold uppercase tracking-wider"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {a.abbr}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- Skill bar with self vs community deltas ---------- */
function SkillBar({
  name, selfRating, communityRating, description,
}: {
  name: string; selfRating: number; communityRating: number; description: string;
}) {
  const tier = tierFor(communityRating);
  const delta = communityRating - selfRating;

  return (
    <div className="p-4 rounded-xl border border-border bg-card card-hover">
      <div className="flex items-center justify-between mb-1.5">
        <h4 className="text-[13px] font-semibold text-foreground">{name}</h4>
        <div className="flex items-center gap-2">
          <span className={`font-heading text-lg font-extrabold tabular-nums ${attrTierClass(communityRating)}`}>
            {communityRating}
          </span>
          {delta !== 0 && (
            <span className={`flex items-center gap-0.5 text-[10px] font-bold ${
              delta > 0 ? "text-warm" : "text-muted-foreground"
            }`}>
              {delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(delta)}
            </span>
          )}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">{description}</p>

      {/* Dual track bars */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground w-12">Self</span>
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-foreground/40"
              style={{ width: `${selfRating}%` }}
            />
          </div>
          <span className="text-[10px] font-bold tabular-nums text-muted-foreground w-7 text-right">{selfRating}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-primary w-12">Comm</span>
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full ${tier.className}`}
              style={{
                width: `${communityRating}%`,
                background: `linear-gradient(90deg, var(--tier), var(--tier-glow))`,
              }}
            />
          </div>
          <span className={`text-[10px] font-bold tabular-nums w-7 text-right ${attrTierClass(communityRating)}`}>{communityRating}</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Form indicator: last 5 results ---------- */
function FormStreak({ form }: { form: ("W" | "L" | "D")[] }) {
  return (
    <div className="flex items-center gap-1">
      {form.map((r, i) => (
        <span
          key={i}
          className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-extrabold ${
            r === "W" ? "bg-primary text-primary-foreground" :
            r === "L" ? "bg-muted text-muted-foreground" :
                        "bg-warm/20 text-warm"
          }`}
        >
          {r}
        </span>
      ))}
    </div>
  );
}

function ProfilePage() {
  const attributes: Attribute[] = [
    { name: "Control",       abbr: "CTL", value: 71, delta: 2 },
    { name: "Volley",        abbr: "VOL", value: 71, delta: 0 },
    { name: "Overheads",     abbr: "OVH", value: 79, delta: 4 },
    { name: "Glass Defense", abbr: "GLS", value: 52, delta: -3 },
    { name: "Positioning",   abbr: "POS", value: 74, delta: 1 },
    { name: "Match Mgmt",    abbr: "MGT", value: 31, delta: 0 },
  ];

  const ovr = calcOVR(attributes);
  const tier = tierFor(ovr);

  // XP / level system
  const totalXP = 2840;
  const { level, current, needed, pct } = levelFromXP(totalXP);

  const skills = [
    { name: "Control", selfRating: 71, communityRating: 71, description: "Touch, precision, and ability to keep the ball in productive areas." },
    { name: "Volley", selfRating: 65, communityRating: 71, description: "Net control, firmness, and decision-making in fast exchanges." },
    { name: "Overheads", selfRating: 75, communityRating: 79, description: "Bandeja, vibora, smash, and ability to cancel or finish overhead situations." },
    { name: "Glass Defense", selfRating: 62, communityRating: 52, description: "Reading rebounds off the glass and turning defense into a stable rally." },
    { name: "Positioning", selfRating: 74, communityRating: 74, description: "Court balance, partner spacing, and choosing the right height in court." },
    { name: "Match Management", selfRating: 38, communityRating: 31, description: "Shot selection, momentum control, and scoring points with discipline." },
  ];

  const history = [
    { org: "Asobu Masters of Universe", role: "Left Side Player", sport: "Padel", period: "2024 – Present", verified: true, current: true },
    { org: "Rugby Lugano", role: "Wing", sport: "Rugby", period: "2019 – 2024", verified: true, current: false },
    { org: "FC Lugano Youth", role: "Midfielder", sport: "Football", period: "2015 – 2019", verified: false, current: false },
  ];

  const achievements = [
    { name: "First Win", icon: Trophy, unlocked: true },
    { name: "Hot Streak", icon: Flame, unlocked: true },
    { name: "Net King", icon: Crown, unlocked: true },
    { name: "Sharpshooter", icon: Target, unlocked: true },
    { name: "Iron Wall", icon: Shield, unlocked: false },
    { name: "MVP", icon: Medal, unlocked: false },
    { name: "Veteran", icon: Award, unlocked: false },
    { name: "Legend", icon: Zap, unlocked: false },
  ];

  const form: ("W" | "L" | "D")[] = ["W", "W", "L", "W", "W"];
  const winStreak = 2;

  const tabs = ["Overview", "Skills", "History", "Media", "Stats"];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        {/* ============ HERO: Player card + Stats panel ============ */}
        <div className="grid lg:grid-cols-[360px_1fr] gap-5 mb-6">
          {/* Player Card — FUT style */}
          <div className="relative">
            <PlayerCard
              name="Nicolas Bachmann"
              initials="NB"
              ovr={ovr}
              position="LS"
              sport="Padel"
              location="Lugano, CH"
              topAttributes={attributes}
              verified
              variant="dark"
            />
            {/* Edit overlay button */}
            <button className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-2 rounded-full bg-card border border-border text-[11px] font-semibold text-foreground hover:bg-muted transition-all elevation-2">
              <Camera className="w-3 h-3" /> Customize Card
            </button>
          </div>

          {/* Right panel: identity + level + form + actions */}
          <div className="flex flex-col gap-4">
            {/* Identity row */}
            <div className="flex items-start justify-between gap-4 p-5 rounded-2xl border border-border bg-card elevation-1">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-heading text-2xl font-bold text-foreground tracking-tight">
                    Nicolas Bachmann
                  </h1>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${tier.className}`}
                    style={{ background: "color-mix(in oklab, var(--tier) 15%, transparent)", color: "var(--tier)" }}>
                    {tier.label}
                  </span>
                </div>
                <p className="text-[13px] text-muted-foreground mt-0.5">Talent Scout · Player</p>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />Lugano, Switzerland</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Joined 2024</span>
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" />2.4k profile views</span>
                </div>
                <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                  <span className="px-2.5 py-1 rounded-lg bg-primary text-[11px] font-semibold text-primary-foreground">Player</span>
                  <span className="px-2.5 py-1 rounded-lg bg-primary/80 text-[11px] font-semibold text-primary-foreground">Talent Scout</span>
                  <span className="px-2.5 py-1 rounded-lg bg-warm text-[11px] font-semibold text-warm-foreground">Padel</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg gradient-brand text-[12px] font-semibold text-primary-foreground hover:opacity-90 transition-all glow-brand-sm">
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-[12px] font-medium text-foreground hover:bg-muted transition-all">
                  <Share2 className="w-3.5 h-3.5" /> Share
                </button>
              </div>
            </div>

            {/* Level + XP + Form + Streak */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Level + XP */}
              <div className="p-4 rounded-2xl border border-border bg-card elevation-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg gradient-brand flex items-center justify-center glow-brand-sm">
                      <span className="font-heading text-[13px] font-extrabold text-primary-foreground">{level}</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Level</p>
                      <p className="font-heading text-sm font-bold text-foreground leading-tight">Rising Star</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold tabular-nums text-muted-foreground">
                    {current}/{needed} XP
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full xp-bar" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  +180 XP this week · {needed - current} XP to <span className="font-bold text-foreground">Level {level + 1}</span>
                </p>
              </div>

              {/* Form + streak */}
              <div className="p-4 rounded-2xl border border-border bg-card elevation-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div className="w-9 h-9 rounded-lg bg-warm/15 flex items-center justify-center pulse-warm">
                        <Flame className="w-4 h-4 text-warm" />
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Form</p>
                      <p className="font-heading text-sm font-bold text-foreground leading-tight">{winStreak}-game streak</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground">Last 5</span>
                </div>
                <FormStreak form={form} />
                <p className="text-[10px] text-muted-foreground mt-2">
                  <span className="font-bold text-primary">4W</span> · 1L · win rate <span className="font-bold text-foreground">80%</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ============ Tabs ============ */}
        <div className="flex gap-1 mb-6 overflow-x-auto border-b border-border">
          {tabs.map((tab, i) => (
            <button
              key={tab}
              className={`px-4 py-2.5 text-[13px] font-semibold whitespace-nowrap transition-all relative ${
                i === 0
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
              {i === 0 && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 gradient-brand rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* ============ Achievements ============ */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
              <Medal className="w-4 h-4 text-warm" /> Achievements
              <span className="text-[11px] font-medium text-muted-foreground ml-1">
                {achievements.filter(a => a.unlocked).length}/{achievements.length}
              </span>
            </h2>
            <button className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5">
              See all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {achievements.map((a) => {
              const Icon = a.icon;
              return (
                <div
                  key={a.name}
                  className="flex flex-col items-center gap-1.5 group cursor-pointer"
                  title={a.name}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${
                      a.unlocked ? "medal" : "medal-locked"
                    }`}
                  >
                    {a.unlocked ? (
                      <Icon className="w-5 h-5 text-white drop-shadow" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider text-center leading-tight ${
                    a.unlocked ? "text-foreground" : "text-muted-foreground"
                  }`}>
                    {a.name}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* ============ Skill identity (radar + bars) ============ */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Skill Identity
            </h2>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-primary/10 text-[11px] font-bold text-primary">Padel</span>
              <span className="text-[11px] text-muted-foreground">+ add sport</span>
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground mb-5">
            Your padel-specific attributes. Community ratings update as teammates and opponents endorse your game.
          </p>

          <div className="grid lg:grid-cols-[320px_1fr] gap-5">
            {/* Radar card */}
            <div className="rounded-2xl border border-border bg-card p-5 elevation-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading text-sm font-bold text-foreground">Attribute Radar</h3>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${tier.className}`}
                  style={{ background: "color-mix(in oklab, var(--tier) 15%, transparent)", color: "var(--tier)" }}>
                  {tier.label}
                </span>
              </div>
              <RadarChart attributes={attributes} ovr={ovr} />
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Monthly trend</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {attributes.map((a) => (
                    <div key={a.abbr} className="flex items-center justify-between px-2 py-1 rounded bg-muted/50">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{a.abbr}</span>
                      {(a.delta ?? 0) !== 0 ? (
                        <span className={`flex items-center gap-0.5 text-[10px] font-bold tabular-nums ${
                          (a.delta ?? 0) > 0 ? "text-primary" : "text-destructive"
                        }`}>
                          {(a.delta ?? 0) > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                          {Math.abs(a.delta ?? 0)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Skill bars */}
            <div className="space-y-3">
              {skills.map((s) => <SkillBar key={s.name} {...s} />)}
            </div>
          </div>
        </section>

        {/* ============ Sporting history ============ */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" /> Career Path
            </h2>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warm text-[11px] font-semibold text-warm-foreground hover:opacity-90 transition-all glow-warm">
              <Plus className="w-3.5 h-3.5" /> Add club
            </button>
          </div>

          {/* Timeline */}
          <div className="relative pl-4 space-y-3 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-border">
            {history.map((item, i) => (
              <div key={i} className="relative">
                <span className={`absolute -left-4 top-4 w-3 h-3 rounded-full border-2 border-background ${
                  item.current ? "bg-warm pulse-warm" : "bg-primary"
                }`} />
                <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card card-hover ml-2">
                  <div className="w-11 h-11 rounded-xl avatar-gradient-subtle flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-bold text-foreground">{item.org}</span>
                      {item.current && <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-warm/15 text-warm uppercase tracking-wider">Current</span>}
                      {item.verified && <Shield className="w-3 h-3 text-primary shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">{item.sport}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">{item.role}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">{item.period}</p>
                  </div>
                  <div className="flex gap-2 text-[11px]">
                    <button className="text-primary hover:underline font-semibold">Edit</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
