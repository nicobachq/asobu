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

export function getSecondaryRoles(
  roles: PersonRole[],
  primaryRole: PersonRole | null | undefined
) {
  return roles.filter((role) => role !== primaryRole);
}

export function formatRoleSummary(
  roles: PersonRole[],
  primaryRole: PersonRole | null | undefined
) {
  const uniqueRoles = getUniquePersonRoles(roles);
  const safePrimary = primaryRole && uniqueRoles.includes(primaryRole) ? primaryRole : uniqueRoles[0] || null;

  if (!safePrimary) return "No role yet";

  const secondaryRoles = getSecondaryRoles(uniqueRoles, safePrimary);
  const primaryLabel = formatPersonRoleLabel(safePrimary);

  if (secondaryRoles.length === 0) {
    return primaryLabel;
  }

  if (secondaryRoles.length === 1) {
    return `${primaryLabel} · also ${formatPersonRoleLabel(secondaryRoles[0])}`;
  }

  return `${primaryLabel} · ${secondaryRoles.length} additional roles`;
}

export function getIdentityContextLabel(
  roles: PersonRole[],
  primaryRole: PersonRole | null | undefined
) {
  const uniqueRoles = getUniquePersonRoles(roles);
  const safePrimary = primaryRole && uniqueRoles.includes(primaryRole) ? primaryRole : uniqueRoles[0] || null;

  if (!safePrimary) return "Identity still being completed";

  const secondaryRoles = getSecondaryRoles(uniqueRoles, safePrimary);

  if (secondaryRoles.length === 0) {
    return `Primary identity: ${formatPersonRoleLabel(safePrimary)}`;
  }

  if (secondaryRoles.length === 1) {
    return `Primary identity: ${formatPersonRoleLabel(safePrimary)} · secondary role: ${formatPersonRoleLabel(
      secondaryRoles[0]
    )}`;
  }

  return `Primary identity: ${formatPersonRoleLabel(safePrimary)} · ${secondaryRoles.length} secondary roles`;
}

export function getOpenToLabelsForRoles(roles: PersonRole[]) {
  const uniqueRoles = getUniquePersonRoles(roles);
  const labels = new Set<string>();

  if (uniqueRoles.includes("player")) {
    labels.add("Teams");
    labels.add("Coaches");
    labels.add("Scouts");
  }

  if (uniqueRoles.includes("coach")) {
    labels.add("Players");
    labels.add("Teams");
    labels.add("Federations");
  }

  if (uniqueRoles.includes("scout")) {
    labels.add("Players");
    labels.add("Coaches");
    labels.add("Organizations");
  }

  return Array.from(labels);
}
