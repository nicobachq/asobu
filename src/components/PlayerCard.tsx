import { Shield, MapPin, Sparkles } from "lucide-react";
import { tierFor, type Attribute } from "@/lib/player";

type Props = {
  name: string;
  initials: string;
  ovr: number;
  position: string;
  sport: string;
  location: string;
  topAttributes: Attribute[]; // up to 6 shown bottom of card
  verified?: boolean;
  variant?: "light" | "dark";
};

export function PlayerCard({
  name,
  initials,
  ovr,
  position,
  sport,
  location,
  topAttributes,
  verified,
  variant = "light",
}: Props) {
  const tier = tierFor(ovr);
  const isElite = tier.key === "elite" || tier.key === "world";

  return (
    <div
      className={`${tier.className} player-card ${
        variant === "dark" ? "player-card-dark" : ""
      } rounded-2xl p-5 relative`}
    >
      {/* Tier ribbon */}
      <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-md bg-black/20 backdrop-blur-sm">
        <Sparkles className="w-3 h-3" style={{ color: "var(--tier-glow)" }} />
        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--tier-glow)" }}>
          {tier.label}
        </span>
      </div>

      {/* Top: OVR + position + sport */}
      <div className="flex items-start gap-4 mb-4">
        <div className="flex flex-col items-center">
          <div
            className={`font-heading text-5xl font-extrabold leading-none tracking-tight ${
              isElite ? "holo-text" : ""
            }`}
            style={!isElite ? { color: "var(--tier)" } : undefined}
          >
            {ovr}
          </div>
          <div
            className="text-[9px] font-bold uppercase tracking-widest mt-1 opacity-60"
            style={{ color: "var(--tier)" }}
          >
            OVR
          </div>
        </div>

        <div className="flex flex-col items-center pt-1">
          <span
            className="px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider"
            style={{ background: "var(--tier)", color: "white" }}
          >
            {position}
          </span>
          <span className={`text-[10px] mt-1 font-medium uppercase tracking-wider ${
            variant === "dark" ? "text-white/60" : "text-muted-foreground"
          }`}>
            {sport}
          </span>
        </div>

        <div className="ml-auto w-16 h-16 rounded-xl avatar-gradient flex items-center justify-center text-lg font-bold text-white border-2 border-white/40 shadow-lg shrink-0">
          {initials}
        </div>
      </div>

      {/* Name + location */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5">
          <h3 className={`font-heading text-base font-bold leading-tight ${
            variant === "dark" ? "text-white" : "text-foreground"
          }`}>
            {name}
          </h3>
          {verified && <Shield className="w-3.5 h-3.5" style={{ color: "var(--tier-glow)" }} />}
        </div>
        <p className={`text-[11px] mt-0.5 flex items-center gap-1 ${
          variant === "dark" ? "text-white/60" : "text-muted-foreground"
        }`}>
          <MapPin className="w-3 h-3" />
          {location}
        </p>
      </div>

      {/* Attribute grid 3x2 */}
      <div className={`grid grid-cols-3 gap-y-2 gap-x-3 pt-3 border-t ${
        variant === "dark" ? "border-white/10" : "border-black/10"
      }`}>
        {topAttributes.slice(0, 6).map((a) => {
          const aTier = tierFor(a.value);
          return (
            <div key={a.abbr} className="flex items-baseline gap-1.5">
              <span
                className="font-heading text-base font-bold tabular-nums"
                style={{ color: `var(--tier)`, ...({ "--tier": `var(--tier)` } as React.CSSProperties) }}
              >
                <span className={aTier.className} style={{ color: "var(--tier)" }}>
                  {a.value}
                </span>
              </span>
              <span className={`text-[9px] font-semibold uppercase tracking-wider ${
                variant === "dark" ? "text-white/50" : "text-muted-foreground"
              }`}>
                {a.abbr}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
