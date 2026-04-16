// Game-style helpers for player ratings, tiers, and progression

export type Attribute = { name: string; abbr: string; value: number; delta?: number };

export type Tier = {
  key: "bronze" | "silver" | "gold" | "elite" | "world";
  label: string;
  min: number;
  className: string;
};

export const TIERS: Tier[] = [
  { key: "bronze", label: "Bronze", min: 0, className: "tier-bronze" },
  { key: "silver", label: "Silver", min: 55, className: "tier-silver" },
  { key: "gold", label: "Gold", min: 70, className: "tier-gold" },
  { key: "elite", label: "Elite", min: 80, className: "tier-elite" },
  { key: "world", label: "World Class", min: 88, className: "tier-world" },
];

export function tierFor(ovr: number): Tier {
  return [...TIERS].reverse().find((t) => ovr >= t.min) ?? TIERS[0];
}

export function attrTierClass(value: number): string {
  if (value >= 85) return "attr-tier-5";
  if (value >= 75) return "attr-tier-4";
  if (value >= 65) return "attr-tier-3";
  if (value >= 50) return "attr-tier-2";
  return "attr-tier-1";
}

// Weighted OVR — gives slight emphasis to top stats (FIFA-style)
export function calcOVR(attrs: Attribute[]): number {
  if (!attrs.length) return 0;
  const sorted = [...attrs].map((a) => a.value).sort((a, b) => b - a);
  const weights = [1.5, 1.3, 1.1, 1.0, 0.9, 0.8];
  let total = 0;
  let wSum = 0;
  sorted.forEach((v, i) => {
    const w = weights[i] ?? 0.7;
    total += v * w;
    wSum += w;
  });
  return Math.round(total / wSum);
}

// XP / Level system — rocket-league inspired curve
export function levelFromXP(xp: number): { level: number; current: number; needed: number; pct: number } {
  let level = 1;
  let remaining = xp;
  let needed = 100;
  while (remaining >= needed) {
    remaining -= needed;
    level += 1;
    needed = Math.round(needed * 1.18);
  }
  return { level, current: remaining, needed, pct: Math.round((remaining / needed) * 100) };
}
