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
  legacySportKeys: string[];
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

const SKILL_VALIDATION_LABEL = 'Anonymous signals from players and coaches';

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
    label: 'Physicality',
    shortLabel: 'PHY',
    description: 'Strength, stamina, balance, and ability to sustain intensity.',
  },
];

const FUTSAL_SKILLS: SkillDefinition[] = [
  {
    key: 'acceleration',
    label: 'Acceleration',
    shortLabel: 'ACC',
    description: 'Explosive first steps, quick changes of rhythm, and sharp reactions in tight spaces.',
  },
  {
    key: 'ball_control',
    label: 'Ball Control',
    shortLabel: 'CTL',
    description: 'Close touch, sole control, and composure under immediate pressure.',
  },
  {
    key: 'combination_play',
    label: 'Combination Play',
    shortLabel: 'COM',
    description: 'Wall passes, rotations, and fast decision-making with teammates.',
  },
  {
    key: 'one_v_one_defending',
    label: '1v1 Defending',
    shortLabel: '1V1',
    description: 'Body shape, timing, and ability to contain duels in open space.',
  },
  {
    key: 'finishing',
    label: 'Finishing',
    shortLabel: 'FIN',
    description: 'Execution around goal, composure in tight angles, and final-touch quality.',
  },
  {
    key: 'intensity',
    label: 'Intensity',
    shortLabel: 'INT',
    description: 'Repeat sprints, pressing energy, and ability to sustain match tempo.',
  },
];

const BASKETBALL_SKILLS: SkillDefinition[] = [
  {
    key: 'ball_handling',
    label: 'Ball Handling',
    shortLabel: 'HAN',
    description: 'Control under pressure, dribble security, and ability to create separation.',
  },
  {
    key: 'shooting',
    label: 'Shooting',
    shortLabel: 'SHT',
    description: 'Shot mechanics, range, and efficiency across game situations.',
  },
  {
    key: 'court_vision',
    label: 'Court Vision',
    shortLabel: 'VIS',
    description: 'Reading the floor, finding options, and making timely decisions.',
  },
  {
    key: 'on_ball_defense',
    label: 'On-ball Defense',
    shortLabel: 'DEF',
    description: 'Containment, lateral discipline, and disrupting opposing actions.',
  },
  {
    key: 'rebounding',
    label: 'Rebounding',
    shortLabel: 'REB',
    description: 'Positioning, timing, and ability to win second-chance possessions.',
  },
  {
    key: 'athleticism',
    label: 'Athleticism',
    shortLabel: 'ATH',
    description: 'Explosiveness, mobility, balance, and physical impact.',
  },
];

const VOLLEYBALL_SKILLS: SkillDefinition[] = [
  {
    key: 'serve',
    label: 'Serve',
    shortLabel: 'SRV',
    description: 'Serve quality, variety, pressure, and consistency from the line.',
  },
  {
    key: 'passing',
    label: 'Passing',
    shortLabel: 'PAS',
    description: 'Reception control and ability to deliver playable first contacts.',
  },
  {
    key: 'setting',
    label: 'Setting',
    shortLabel: 'SET',
    description: 'Tempo control, placement, and decision-making in build-up.',
  },
  {
    key: 'attack',
    label: 'Attack',
    shortLabel: 'ATK',
    description: 'Finishing quality, timing, and scoring threat at the net.',
  },
  {
    key: 'block',
    label: 'Block',
    shortLabel: 'BLK',
    description: 'Reading hitters, hand timing, and net presence.',
  },
  {
    key: 'defense',
    label: 'Defense',
    shortLabel: 'DEF',
    description: 'Floor coverage, reaction speed, and ability to keep rallies alive.',
  },
];

const RUGBY_SKILLS: SkillDefinition[] = [
  {
    key: 'carrying',
    label: 'Carrying',
    shortLabel: 'CAR',
    description: 'Gain-line threat, body control in contact, and ability to advance play.',
  },
  {
    key: 'tackling',
    label: 'Tackling',
    shortLabel: 'TCK',
    description: 'Technique, timing, and reliability in defensive contact.',
  },
  {
    key: 'breakdown',
    label: 'Breakdown',
    shortLabel: 'BRK',
    description: 'Ruck efficiency, support speed, and contest awareness.',
  },
  {
    key: 'game_management',
    label: 'Game Management',
    shortLabel: 'GME',
    description: 'Reading momentum, field position, and making winning decisions.',
  },
  {
    key: 'speed',
    label: 'Speed',
    shortLabel: 'SPD',
    description: 'Acceleration, recovery pace, and effectiveness in open-field transitions.',
  },
  {
    key: 'physicality',
    label: 'Physicality',
    shortLabel: 'PHY',
    description: 'Power, endurance, contact resilience, and repeated effort.',
  },
];

const TENNIS_SKILLS: SkillDefinition[] = [
  {
    key: 'serve',
    label: 'Serve',
    shortLabel: 'SRV',
    description: 'Quality, variety, placement, and ability to start points on the front foot.',
  },
  {
    key: 'return',
    label: 'Return',
    shortLabel: 'RET',
    description: 'Reading serves, neutralizing pressure, and creating immediate initiative.',
  },
  {
    key: 'baseline_play',
    label: 'Baseline Play',
    shortLabel: 'BSL',
    description: 'Depth, control, and consistency in rallies from the back of the court.',
  },
  {
    key: 'net_play',
    label: 'Net Play',
    shortLabel: 'NET',
    description: 'Volley quality, transition timing, and finishing at the net.',
  },
  {
    key: 'movement',
    label: 'Movement',
    shortLabel: 'MOV',
    description: 'Footwork, balance, recovery steps, and court coverage.',
  },
  {
    key: 'match_management',
    label: 'Match Management',
    shortLabel: 'MCH',
    description: 'Point construction, composure, and tactical adjustment under pressure.',
  },
];

const PADEL_SKILLS: SkillDefinition[] = [
  {
    key: 'control',
    label: 'Control',
    shortLabel: 'CTL',
    description: 'Touch, precision, and ability to keep the ball in productive areas.',
  },
  {
    key: 'volley',
    label: 'Volley',
    shortLabel: 'VOL',
    description: 'Net control, firmness, and decision-making in fast exchanges.',
  },
  {
    key: 'overheads',
    label: 'Overheads',
    shortLabel: 'OVH',
    description: 'Bandeja, vibora, smash, and ability to control or finish overhead situations.',
  },
  {
    key: 'glass_defense',
    label: 'Glass Defense',
    shortLabel: 'GLS',
    description: 'Reading rebounds off the glass and turning defense into a stable rally.',
  },
  {
    key: 'positioning',
    label: 'Positioning',
    shortLabel: 'POS',
    description: 'Court balance, partner spacing, and choosing the right height on court.',
  },
  {
    key: 'match_management',
    label: 'Match Management',
    shortLabel: 'MCH',
    description: 'Shot selection, momentum control, and solving points with discipline.',
  },
];

const FLOORBALL_SKILLS: SkillDefinition[] = [
  {
    key: 'ball_control',
    label: 'Ball Control',
    shortLabel: 'CTL',
    description: 'Stick handling, first touch, and control at speed.',
  },
  {
    key: 'passing',
    label: 'Passing',
    shortLabel: 'PAS',
    description: 'Distribution quality, tempo, and ability to connect play quickly.',
  },
  {
    key: 'finishing',
    label: 'Finishing',
    shortLabel: 'FIN',
    description: 'Shot execution, release quality, and end-product in scoring moments.',
  },
  {
    key: 'positioning',
    label: 'Positioning',
    shortLabel: 'POS',
    description: 'Reading space, support angles, and awareness without the ball.',
  },
  {
    key: 'defending',
    label: 'Defending',
    shortLabel: 'DEF',
    description: 'Pressure timing, stick discipline, and defensive body positioning.',
  },
  {
    key: 'mobility',
    label: 'Mobility',
    shortLabel: 'MOV',
    description: 'Footwork, change of direction, and repeat movement across shifts.',
  },
];

const ICE_HOCKEY_SKILLS: SkillDefinition[] = [
  {
    key: 'skating',
    label: 'Skating',
    shortLabel: 'SKT',
    description: 'Stride efficiency, acceleration, edge control, and pace on ice.',
  },
  {
    key: 'puck_control',
    label: 'Puck Control',
    shortLabel: 'PCK',
    description: 'Handling, first touch, and composure with the puck under pressure.',
  },
  {
    key: 'passing',
    label: 'Passing',
    shortLabel: 'PAS',
    description: 'Distribution speed, accuracy, and ability to move play cleanly.',
  },
  {
    key: 'finishing',
    label: 'Finishing',
    shortLabel: 'FIN',
    description: 'Shot release, timing, and threat in scoring situations.',
  },
  {
    key: 'positioning',
    label: 'Positioning',
    shortLabel: 'POS',
    description: 'Reading transitions, spacing, and support in both directions.',
  },
  {
    key: 'physicality',
    label: 'Physicality',
    shortLabel: 'PHY',
    description: 'Strength, contact resilience, and ability to impose yourself in duels.',
  },
];

const FIELD_HOCKEY_SKILLS: SkillDefinition[] = [
  {
    key: 'first_touch',
    label: 'First Touch',
    shortLabel: 'TCH',
    description: 'Receiving quality, control under pressure, and ability to set the next action.',
  },
  {
    key: 'passing',
    label: 'Passing',
    shortLabel: 'PAS',
    description: 'Tempo, accuracy, and ability to circulate the ball through lines.',
  },
  {
    key: 'carrying',
    label: 'Carrying',
    shortLabel: 'CAR',
    description: 'Driving with the ball, progressing play, and breaking pressure.',
  },
  {
    key: 'defending',
    label: 'Defending',
    shortLabel: 'DEF',
    description: 'Body position, tackle timing, and defensive awareness.',
  },
  {
    key: 'positioning',
    label: 'Positioning',
    shortLabel: 'POS',
    description: 'Spacing, support angles, and game reading without the ball.',
  },
  {
    key: 'speed',
    label: 'Speed',
    shortLabel: 'SPD',
    description: 'Burst, recovery pace, and ability to repeat high-speed actions.',
  },
];

const ROLLER_HOCKEY_SKILLS: SkillDefinition[] = [
  {
    key: 'skating',
    label: 'Skating',
    shortLabel: 'SKT',
    description: 'Stride, balance, and speed control on skates.',
  },
  {
    key: 'stick_control',
    label: 'Stick Control',
    shortLabel: 'CTL',
    description: 'Handling security, first touch, and control while moving at pace.',
  },
  {
    key: 'passing',
    label: 'Passing',
    shortLabel: 'PAS',
    description: 'Accuracy, timing, and ability to connect quick combinations.',
  },
  {
    key: 'finishing',
    label: 'Finishing',
    shortLabel: 'FIN',
    description: 'Shot quality, release, and threat in final actions.',
  },
  {
    key: 'defending',
    label: 'Defending',
    shortLabel: 'DEF',
    description: 'Containment, stick discipline, and defensive anticipation.',
  },
  {
    key: 'game_sense',
    label: 'Game Sense',
    shortLabel: 'SNS',
    description: 'Reading space, tempo, and choosing the right option under pressure.',
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

type SkillTemplateConfig = Omit<SkillTemplate, 'sportLabel'>;

const TEMPLATE_CONFIGS: Record<string, SkillTemplateConfig> = {
  football: {
    key: 'football',
    label: 'Football attributes',
    intro:
      'A football-specific skill identity shaped for the roles and demands that matter most on the pitch.',
    validationLabel: SKILL_VALIDATION_LABEL,
    skills: FOOTBALL_SKILLS,
    legacySportKeys: ['generic'],
  },
  futsal: {
    key: 'futsal',
    label: 'Futsal attributes',
    intro:
      'A futsal-specific skill identity focused on fast decisions, technical security, and repeated intensity in tight spaces.',
    validationLabel: SKILL_VALIDATION_LABEL,
    skills: FUTSAL_SKILLS,
    legacySportKeys: ['football', 'generic'],
  },
  basketball: {
    key: 'basketball',
    label: 'Basketball attributes',
    intro:
      'A basketball-specific skill identity built around handling, decision-making, defense, and physical impact.',
    validationLabel: SKILL_VALIDATION_LABEL,
    skills: BASKETBALL_SKILLS,
    legacySportKeys: ['generic'],
  },
  volleyball: {
    key: 'volleyball',
    label: 'Volleyball attributes',
    intro:
      'A volleyball-specific skill identity built around the technical actions that define each rally.',
    validationLabel: SKILL_VALIDATION_LABEL,
    skills: VOLLEYBALL_SKILLS,
    legacySportKeys: ['generic'],
  },
  rugby: {
    key: 'rugby',
    label: 'Rugby attributes',
    intro:
      'A rugby-specific skill identity shaped around contact, breakdown efficiency, field management, and repeated effort.',
    validationLabel: SKILL_VALIDATION_LABEL,
    skills: RUGBY_SKILLS,
    legacySportKeys: ['generic'],
  },
  tennis: {
    key: 'tennis',
    label: 'Tennis attributes',
    intro:
      'A tennis-specific skill identity focused on serve, movement, point construction, and match control.',
    validationLabel: SKILL_VALIDATION_LABEL,
    skills: TENNIS_SKILLS,
    legacySportKeys: ['generic'],
  },
  padel: {
    key: 'padel',
    label: 'Padel attributes',
    intro:
      'A padel-specific skill identity built around control, net presence, glass defense, and tactical discipline.',
    validationLabel: SKILL_VALIDATION_LABEL,
    skills: PADEL_SKILLS,
    legacySportKeys: ['generic'],
  },
  floorball: {
    key: 'floorball',
    label: 'Unihockey / Floorball attributes',
    intro:
      'A floorball-specific skill identity focused on technical sharpness, quick passing, finishing, and mobility.',
    validationLabel: SKILL_VALIDATION_LABEL,
    skills: FLOORBALL_SKILLS,
    legacySportKeys: ['generic'],
  },
  'ice-hockey': {
    key: 'ice-hockey',
    label: 'Ice hockey attributes',
    intro:
      'An ice hockey-specific skill identity built around skating, puck control, positioning, and physical impact.',
    validationLabel: SKILL_VALIDATION_LABEL,
    skills: ICE_HOCKEY_SKILLS,
    legacySportKeys: ['generic'],
  },
  'field-hockey': {
    key: 'field-hockey',
    label: 'Field hockey attributes',
    intro:
      'A field hockey-specific skill identity focused on control, distribution, movement, and two-way awareness.',
    validationLabel: SKILL_VALIDATION_LABEL,
    skills: FIELD_HOCKEY_SKILLS,
    legacySportKeys: ['generic'],
  },
  'roller-hockey': {
    key: 'roller-hockey',
    label: 'Roller hockey attributes',
    intro:
      'A roller hockey-specific skill identity built around skating control, stick skill, finishing, and game sense.',
    validationLabel: SKILL_VALIDATION_LABEL,
    skills: ROLLER_HOCKEY_SKILLS,
    legacySportKeys: ['generic'],
  },
  generic: {
    key: 'generic',
    label: 'Sports attributes',
    intro:
      'A flexible skill identity for sports outside the current sport-specific packs, combining self-assessment with trusted anonymous voting from players and coaches.',
    validationLabel: SKILL_VALIDATION_LABEL,
    skills: GENERIC_SPORT_SKILLS,
    legacySportKeys: [],
  },
};

const LEGACY_SKILL_MAPPINGS: Record<string, Record<string, Record<string, string>>> = {
  football: {
    generic: {
      pace: 'mobility',
      passing: 'technique',
      dribbling: 'technique',
      finishing: 'power',
      defending: 'consistency',
      physical: 'power',
    },
  },
  futsal: {
    football: {
      acceleration: 'pace',
      ball_control: 'dribbling',
      combination_play: 'passing',
      one_v_one_defending: 'defending',
      finishing: 'finishing',
      intensity: 'physical',
    },
    generic: {
      acceleration: 'mobility',
      ball_control: 'technique',
      combination_play: 'tactics',
      one_v_one_defending: 'consistency',
      finishing: 'power',
      intensity: 'mentality',
    },
  },
  basketball: {
    generic: {
      ball_handling: 'technique',
      shooting: 'power',
      court_vision: 'tactics',
      on_ball_defense: 'consistency',
      rebounding: 'power',
      athleticism: 'mobility',
    },
  },
  volleyball: {
    generic: {
      serve: 'power',
      passing: 'technique',
      setting: 'tactics',
      attack: 'power',
      block: 'power',
      defense: 'consistency',
    },
  },
  rugby: {
    generic: {
      carrying: 'power',
      tackling: 'power',
      breakdown: 'technique',
      game_management: 'tactics',
      speed: 'mobility',
      physicality: 'power',
    },
  },
  tennis: {
    generic: {
      serve: 'power',
      return: 'technique',
      baseline_play: 'consistency',
      net_play: 'technique',
      movement: 'mobility',
      match_management: 'mentality',
    },
  },
  padel: {
    generic: {
      control: 'technique',
      volley: 'technique',
      overheads: 'power',
      glass_defense: 'consistency',
      positioning: 'tactics',
      match_management: 'mentality',
    },
  },
  floorball: {
    generic: {
      ball_control: 'technique',
      passing: 'technique',
      finishing: 'power',
      positioning: 'tactics',
      defending: 'consistency',
      mobility: 'mobility',
    },
  },
  'ice-hockey': {
    generic: {
      skating: 'mobility',
      puck_control: 'technique',
      passing: 'technique',
      finishing: 'power',
      positioning: 'tactics',
      physicality: 'power',
    },
  },
  'field-hockey': {
    generic: {
      first_touch: 'technique',
      passing: 'technique',
      carrying: 'mobility',
      defending: 'consistency',
      positioning: 'tactics',
      speed: 'mobility',
    },
  },
  'roller-hockey': {
    generic: {
      skating: 'mobility',
      stick_control: 'technique',
      passing: 'technique',
      finishing: 'power',
      defending: 'consistency',
      game_sense: 'tactics',
    },
  },
};

export function clampSkillRating(value: number) {
  return Math.max(20, Math.min(99, Math.round(value)));
}

export function resolveSkillTemplate(mainSport: string | null | undefined): SkillTemplate {
  const normalized = getNormalizedSportsFromValue(mainSport);
  const primarySportKey = normalized[0] || 'generic';
  const primarySportLabel = getPrimarySportLabelFromValue(mainSport);
  const config = TEMPLATE_CONFIGS[primarySportKey] || TEMPLATE_CONFIGS.generic;

  return {
    ...config,
    sportLabel:
      config.key === 'generic'
        ? primarySportLabel
        : primarySportLabel === 'Not specified'
          ? config.label.replace(/ attributes$/i, '')
          : primarySportLabel,
  };
}

export function getSkillQuerySportKeys(template: SkillTemplate) {
  return Array.from(new Set([template.key, ...template.legacySportKeys]));
}

export function buildDefaultSkillRatings(template: SkillTemplate) {
  return template.skills.map((skill) => ({
    skill_key: skill.key,
    self_rating: 60,
  }));
}

export function seedSkillEntriesFromLegacy(
  template: SkillTemplate,
  sourceSportKey: string,
  legacyEntries: Array<SkillEntryValue | null | undefined>
) {
  if (sourceSportKey === template.key) {
    return template.skills.map((skill) => ({
      skill_key: skill.key,
      self_rating: clampSkillRating(
        legacyEntries.find((entry) => entry?.skill_key === skill.key)?.self_rating ?? 60
      ),
    }));
  }

  const mapping = LEGACY_SKILL_MAPPINGS[template.key]?.[sourceSportKey];
  const entryMap = new Map(
    legacyEntries.filter(Boolean).map((entry) => [entry!.skill_key, clampSkillRating(entry!.self_rating)])
  );

  if (!mapping) {
    return buildDefaultSkillRatings(template);
  }

  return template.skills.map((skill) => ({
    skill_key: skill.key,
    self_rating: entryMap.get(mapping[skill.key]) ?? 60,
  }));
}

export function hasCompleteSkillIdentity(
  template: SkillTemplate,
  entries: Array<SkillEntryValue | null | undefined>
) {
  const entryKeys = new Set(entries.filter(Boolean).map((entry) => entry!.skill_key));
  return template.skills.every((skill) => entryKeys.has(skill.key));
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
