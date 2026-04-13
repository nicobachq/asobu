import { getNormalizedSportsFromValue, getPrimarySportLabelFromValue } from './sports';

export type SkillDefinition = {
  key: string;
  label: string;
  shortLabel: string;
  description: string;
};

export type SkillTemplate = {
  key: string;
  label: string;
  sportLabel: string;
  intro: string;
  validationLabel: string;
  skills: SkillDefinition[];
};

export type SkillEntryValue = {
  skill_key: string;
  self_rating: number;
};

export type SkillValidationSummary = {
  lowerCount: number;
  fairCount: number;
  higherCount: number;
  totalCount: number;
  averageVote: number;
};

const FOOTBALL_SKILLS: SkillDefinition[] = [
  {
    key: 'pace',
    label: 'Pace',
    shortLabel: 'PAC',
    description: 'Acceleration, change of speed, and ability to attack space quickly.',
  },
  {
    key: 'passing',
    label: 'Passing',
    shortLabel: 'PAS',
    description: 'Distribution quality, timing, and ability to move the ball cleanly.',
  },
  {
    key: 'dribbling',
    label: 'Dribbling',
    shortLabel: 'DRI',
    description: 'Ball carrying, close control, and ability to beat pressure.',
  },
  {
    key: 'finishing',
    label: 'Finishing',
    shortLabel: 'FIN',
    description: 'Final-third execution, composure, and shot quality.',
  },
  {
    key: 'defending',
    label: 'Defending',
    shortLabel: 'DEF',
    description: 'Reading duels, positioning, pressing, and defensive timing.',
  },
  {
    key: 'physical',
    label: 'Physical',
    shortLabel: 'PHY',
    description: 'Strength, stamina, balance, and ability to sustain intensity.',
  },
];

const GENERIC_SPORT_SKILLS: SkillDefinition[] = [
  {
    key: 'technique',
    label: 'Technique',
    shortLabel: 'TEC',
    description: 'Execution quality, touch, and sport-specific technical control.',
  },
  {
    key: 'tactics',
    label: 'Tactical Reading',
    shortLabel: 'TAC',
    description: 'Understanding of rhythm, positioning, and game situations.',
  },
  {
    key: 'mobility',
    label: 'Mobility',
    shortLabel: 'MOV',
    description: 'Movement quality, coordination, and ability to adapt in space.',
  },
  {
    key: 'power',
    label: 'Power',
    shortLabel: 'POW',
    description: 'Explosiveness, force production, and physical edge.',
  },
  {
    key: 'consistency',
    label: 'Consistency',
    shortLabel: 'CON',
    description: 'Reliability of performance over time, sessions, and competition.',
  },
  {
    key: 'mentality',
    label: 'Mentality',
    shortLabel: 'MEN',
    description: 'Composure, resilience, and competitive mindset.',
  },
];

export function clampSkillRating(value: number) {
  return Math.max(20, Math.min(99, Math.round(value)));
}

export function resolveSkillTemplate(mainSport: string | null | undefined): SkillTemplate {
  const normalized = getNormalizedSportsFromValue(mainSport);
  const primarySportLabel = getPrimarySportLabelFromValue(mainSport);

  if (normalized.includes('football') || normalized.includes('futsal')) {
    return {
      key: 'football',
      label: 'Football attributes',
      sportLabel: primarySportLabel === 'Not specified' ? 'Football' : primarySportLabel,
      intro:
        'A football-first skill identity inspired by familiar game-style attributes, but grounded in self-assessment plus trusted anonymous voting.',
      validationLabel: 'Anonymous signals from players and coaches',
      skills: FOOTBALL_SKILLS,
    };
  }

  return {
    key: 'generic',
    label: 'Sports attributes',
    sportLabel: primarySportLabel,
    intro:
      'A flexible skill identity for sports outside football, combining self-assessment with trusted anonymous voting from players and coaches.',
    validationLabel: 'Anonymous signals from players and coaches',
    skills: GENERIC_SPORT_SKILLS,
  };
}

export function buildDefaultSkillRatings(template: SkillTemplate) {
  return template.skills.map((skill) => ({
    skill_key: skill.key,
    self_rating: 60,
  }));
}

export function emptySkillValidationSummary(): SkillValidationSummary {
  return {
    lowerCount: 0,
    fairCount: 0,
    higherCount: 0,
    totalCount: 0,
    averageVote: 0,
  };
}

export function getAdjustedCommunitySkillRating(
  selfRating: number,
  summary?: Partial<SkillValidationSummary> | null
) {
  const totalCount = summary?.totalCount ?? 0;
  const averageVote = summary?.averageVote ?? 0;

  if (totalCount <= 0) {
    return clampSkillRating(selfRating);
  }

  const confidence = Math.min(totalCount / 8, 1);
  const adjustment = Math.round(averageVote * 12 * confidence);

  return clampSkillRating(selfRating + adjustment);
}

export function mergeSkillEntriesWithTemplate(
  template: SkillTemplate,
  entries: Array<SkillEntryValue | null | undefined>,
  validationSummaries?: Record<string, SkillValidationSummary>
) {
  const entryMap = new Map(
    entries
      .filter(Boolean)
      .map((entry) => [entry!.skill_key, clampSkillRating(entry!.self_rating)])
  );

  return template.skills.map((skill) => {
    const selfRating = entryMap.get(skill.key) ?? 60;
    const validationSummary = validationSummaries?.[skill.key] ?? emptySkillValidationSummary();
    const communityScore = getAdjustedCommunitySkillRating(selfRating, validationSummary);

    return {
      ...skill,
      selfRating,
      validationSummary,
      communityScore,
    };
  });
}

export function getVoteLabel(voteValue: number) {
  if (voteValue > 0) return 'Higher';
  if (voteValue < 0) return 'Lower';
  return 'Fair';
}
