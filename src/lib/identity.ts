export type PersonRole = "player" | "coach" | "scout";

export type OrganizationRegistrationType =
  | "team"
  | "federation"
  | "club"
  | "entity"
  | "community";

export const PERSON_ROLE_OPTIONS: { value: PersonRole; label: string }[] = [
  { value: "player", label: "Player" },
  { value: "coach", label: "Coach" },
  { value: "scout", label: "Talent Scout" },
];

export const ORGANIZATION_REGISTRATION_OPTIONS: {
  value: OrganizationRegistrationType;
  label: string;
  description: string;
}[] = [
  {
    value: "team",
    label: "Team",
    description: "For team sports such as football, futsal, basketball, or volleyball.",
  },
  {
    value: "federation",
    label: "Federation",
    description: "For sport federations or official governing structures.",
  },
  {
    value: "club",
    label: "Club",
    description: "For clubs that may host several teams or sports activities.",
  },
  {
    value: "entity",
    label: "Entity",
    description: "For academies, training structures, agencies, or other sport entities.",
  },
  {
    value: "community",
    label: "Community",
    description: "For informal or user-created sport communities.",
  },
];

export function normalizePersonRole(value: string | null | undefined): PersonRole | null {
  const normalized = (value || "").trim().toLowerCase();

  if (["player", "athlete", "sports player", "sport player"].includes(normalized)) {
    return "player";
  }

  if (["coach", "trainer", "manager", "assistant coach"].includes(normalized)) {
    return "coach";
  }

  if (["scout", "talent scout", "recruiter"].includes(normalized)) {
    return "scout";
  }

  return null;
}

export function formatPersonRoleLabel(role: PersonRole) {
  return PERSON_ROLE_OPTIONS.find((option) => option.value === role)?.label || role;
}

export function buildRoleSelectionMap(roles: PersonRole[]) {
  const normalizedRoles = getUniquePersonRoles(roles);

  return {
    player: normalizedRoles.includes("player"),
    coach: normalizedRoles.includes("coach"),
    scout: normalizedRoles.includes("scout"),
  } satisfies Record<PersonRole, boolean>;
}

export function getUniquePersonRoles(values: Array<string | null | undefined>) {
  const roles = values
    .map((value) => normalizePersonRole(value))
    .filter(Boolean) as PersonRole[];

  return Array.from(new Set(roles));
}
