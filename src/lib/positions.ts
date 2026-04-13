import { getNormalizedSportsFromValue, getPrimarySportLabelFromValue } from './sports';

export type PositionOption = {
  value: string;
  label: string;
};

const GENERIC_POSITIONS: PositionOption[] = [
  { value: 'player', label: 'Player' },
  { value: 'coach-staff', label: 'Coach / Staff' },
  { value: 'other', label: 'Other' },
];

const POSITION_OPTIONS_BY_SPORT: Record<string, PositionOption[]> = {
  football: [
    { value: 'goalkeeper', label: 'Goalkeeper' },
    { value: 'defender', label: 'Defender' },
    { value: 'midfielder', label: 'Midfielder' },
    { value: 'attacker', label: 'Attacker' },
    { value: 'coach-staff', label: 'Coach / Staff' },
  ],
  futsal: [
    { value: 'goalkeeper', label: 'Goalkeeper' },
    { value: 'defender', label: 'Defender' },
    { value: 'winger', label: 'Winger' },
    { value: 'pivot', label: 'Pivot' },
    { value: 'coach-staff', label: 'Coach / Staff' },
  ],
  basketball: [
    { value: 'point-guard', label: 'Point Guard' },
    { value: 'shooting-guard', label: 'Shooting Guard' },
    { value: 'small-forward', label: 'Small Forward' },
    { value: 'power-forward', label: 'Power Forward' },
    { value: 'center', label: 'Center' },
    { value: 'coach-staff', label: 'Coach / Staff' },
  ],
  volleyball: [
    { value: 'setter', label: 'Setter' },
    { value: 'outside-hitter', label: 'Outside Hitter' },
    { value: 'opposite', label: 'Opposite' },
    { value: 'middle-blocker', label: 'Middle Blocker' },
    { value: 'libero', label: 'Libero' },
    { value: 'coach-staff', label: 'Coach / Staff' },
  ],
  rugby: [
    { value: 'loosehead-prop', label: 'Loosehead Prop' },
    { value: 'hooker', label: 'Hooker' },
    { value: 'tighthead-prop', label: 'Tighthead Prop' },
    { value: 'lock', label: 'Lock' },
    { value: 'flanker', label: 'Flanker' },
    { value: 'number-8', label: 'Number 8' },
    { value: 'scrum-half', label: 'Scrum-half' },
    { value: 'fly-half', label: 'Fly-half' },
    { value: 'centre', label: 'Centre' },
    { value: 'wing', label: 'Wing' },
    { value: 'fullback', label: 'Fullback' },
    { value: 'coach-staff', label: 'Coach / Staff' },
  ],
  tennis: [
    { value: 'singles-player', label: 'Singles Player' },
    { value: 'doubles-player', label: 'Doubles Player' },
    { value: 'coach-staff', label: 'Coach / Staff' },
  ],
  padel: [
    { value: 'left-side-player', label: 'Left Side Player' },
    { value: 'right-side-player', label: 'Right Side Player' },
    { value: 'coach-staff', label: 'Coach / Staff' },
  ],
  floorball: [
    { value: 'goalkeeper', label: 'Goalkeeper' },
    { value: 'defender', label: 'Defender' },
    { value: 'center', label: 'Center' },
    { value: 'winger', label: 'Winger' },
    { value: 'coach-staff', label: 'Coach / Staff' },
  ],
  'ice-hockey': [
    { value: 'goalkeeper', label: 'Goalkeeper' },
    { value: 'defender', label: 'Defender' },
    { value: 'center', label: 'Center' },
    { value: 'winger', label: 'Winger' },
    { value: 'coach-staff', label: 'Coach / Staff' },
  ],
  'field-hockey': [
    { value: 'goalkeeper', label: 'Goalkeeper' },
    { value: 'defender', label: 'Defender' },
    { value: 'midfielder', label: 'Midfielder' },
    { value: 'forward', label: 'Forward' },
    { value: 'coach-staff', label: 'Coach / Staff' },
  ],
  'roller-hockey': [
    { value: 'goalkeeper', label: 'Goalkeeper' },
    { value: 'defender', label: 'Defender' },
    { value: 'forward', label: 'Forward' },
    { value: 'coach-staff', label: 'Coach / Staff' },
  ],
};

export function getPrimarySportValue(value: string | null | undefined) {
  return getNormalizedSportsFromValue(value)[0] || 'other';
}

export function getPositionOptionsForSport(value: string | null | undefined): PositionOption[] {
  const sportValue = getPrimarySportValue(value);
  return POSITION_OPTIONS_BY_SPORT[sportValue] || GENERIC_POSITIONS;
}

export function getPositionLabel(
  sportValue: string | null | undefined,
  positionKey: string | null | undefined
) {
  if (!positionKey) return 'Position not specified';
  return (
    getPositionOptionsForSport(sportValue).find((option) => option.value === positionKey)?.label ||
    positionKey
      .split('-')
      .map((piece) => piece.charAt(0).toUpperCase() + piece.slice(1))
      .join(' ')
  );
}

export function getPositionGroupLabel(sportValue: string | null | undefined) {
  return `${getPrimarySportLabelFromValue(sportValue)} position`;
}
