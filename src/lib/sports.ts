export type SportOption = {
  value: string;
  label: string;
};

export const DISCOVER_SPORT_OPTIONS: SportOption[] = [
  { value: "all", label: "All sports" },
  { value: "football", label: "Football" },
  { value: "futsal", label: "Futsal" },
  { value: "basketball", label: "Basketball" },
  { value: "volleyball", label: "Volleyball" },
  { value: "tennis", label: "Tennis" },
  { value: "padel", label: "Padel" },
  { value: "handball", label: "Handball" },
  { value: "rugby", label: "Rugby" },
  { value: "athletics", label: "Athletics" },
  { value: "swimming", label: "Swimming" },
  { value: "cycling", label: "Cycling" },
  { value: "martial-arts", label: "Martial Arts" },
  { value: "gymnastics", label: "Gymnastics" },
  { value: "winter-sports", label: "Ski / Winter Sports" },
  { value: "motorsport", label: "Motorsport" },
  { value: "other", label: "Other" },
];

export const SPORT_REGISTRATION_OPTIONS: SportOption[] = DISCOVER_SPORT_OPTIONS.filter(
  (option) => option.value !== "all"
);

const SPORT_ALIASES: Record<string, string[]> = {
  football: ["football", "soccer", "calcio", "futbol", "fútbol"],
  futsal: ["futsal", "5-a-side", "five-a-side", "indoor football"],
  basketball: ["basketball"],
  volleyball: ["volleyball", "beach volleyball", "volley"],
  tennis: ["tennis"],
  padel: ["padel", "paddle"],
  handball: ["handball"],
  rugby: ["rugby"],
  athletics: ["athletics", "track and field", "track & field", "running"],
  swimming: ["swimming"],
  cycling: ["cycling", "biking", "road cycling", "mtb", "mountain bike"],
  "martial-arts": [
    "martial arts",
    "mma",
    "boxing",
    "judo",
    "karate",
    "taekwondo",
    "wrestling",
    "kickboxing",
    "muay thai",
    "bjj",
    "jiu jitsu",
    "jiu-jitsu",
  ],
  gymnastics: ["gymnastics"],
  "winter-sports": [
    "ski",
    "skiing",
    "snowboard",
    "snowboarding",
    "ice hockey",
    "figure skating",
    "winter sports",
  ],
  motorsport: ["motorsport", "motocross", "karting", "formula", "rally"],
};

const SPORT_LABEL_BY_VALUE = DISCOVER_SPORT_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {} as Record<string, string>);

function normalizePiece(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function findCanonicalSport(rawValue: string): string | null {
  const normalized = normalizePiece(rawValue);
  if (!normalized) return null;

  for (const [canonical, aliases] of Object.entries(SPORT_ALIASES)) {
    if (aliases.some((alias) => normalized === alias || normalized.includes(alias))) {
      return canonical;
    }
  }

  return "other";
}

export function getNormalizedSportsFromValue(value: string | null | undefined): string[] {
  if (!value) return [];

  const pieces = value
    .split(/[,/;|]+|\sand\s|\se\s|\set\s/gi)
    .map((part) => part.trim())
    .filter(Boolean);

  const sourcePieces = pieces.length > 0 ? pieces : [value.trim()];
  const found = new Set<string>();

  for (const piece of sourcePieces) {
    const canonical = findCanonicalSport(piece);
    if (canonical) {
      found.add(canonical);
    }
  }

  return Array.from(found);
}

export function getSportLabelsFromValue(value: string | null | undefined): string[] {
  return getNormalizedSportsFromValue(value).map(
    (sportValue) => SPORT_LABEL_BY_VALUE[sportValue] || "Other"
  );
}

export function getPrimarySportLabelFromValue(value: string | null | undefined) {
  return getSportLabelsFromValue(value)[0] || "Not specified";
}
