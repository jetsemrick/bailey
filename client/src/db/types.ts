export type TournamentType = 'judge' | 'competitor';

export interface Tournament {
  id: string;
  user_id: string;
  name: string;
  date: string | null;
  location: string | null;
  tournament_type?: TournamentType;
  team_name?: string | null;
  created_at: string;
  updated_at: string;
}

/** Round options for dropdown: value stored in DB, label shown in UI */
export const ROUND_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Practice' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
  { value: 6, label: '6' },
  { value: 7, label: '7' },
  { value: 8, label: '8' },
  { value: 9, label: 'Triple-Octofinals' },
  { value: 10, label: 'Double-Octofinals' },
  { value: 11, label: 'Octofinals' },
  { value: 12, label: 'Quarterfinals' },
  { value: 13, label: 'Semifinals' },
  { value: 14, label: 'Finals' },
];

export function getRoundLabel(roundNumber: number): string {
  const opt = ROUND_OPTIONS.find((o) => o.value === roundNumber);
  return opt?.label ?? `Round ${roundNumber}`;
}

export interface Round {
  id: string;
  user_id: string;
  tournament_id: string;
  round_number: number;
  opponent: string;
  team_aff?: string;
  team_neg?: string;
  side: 'aff' | 'neg';
  result: 'W' | 'L' | null;
  judge?: string;
  created_at: string;
  updated_at: string;
}

/** Format round as "Team A v. Team B", falling back to legacy opponent or round number.
 *  When teamName is provided (competitor), use it for TBD when it matches the user's side. */
export function formatRoundName(r: Round, teamName?: string | null): string {
  const aff = (r.team_aff ?? '').trim();
  const neg = (r.team_neg ?? '').trim();
  const tn = (teamName ?? '').trim();
  if (aff || neg) {
    const affDisplay = aff || (r.side === 'aff' && tn ? tn : 'TBD');
    const negDisplay = neg || (r.side === 'neg' && tn ? tn : 'TBD');
    return `${affDisplay} v. ${negDisplay}`;
  }
  if (r.opponent) return `${getRoundLabel(r.round_number)} vs ${r.opponent}`;
  return getRoundLabel(r.round_number);
}

export interface Flow {
  id: string;
  user_id: string;
  round_id: string;
  position_name: string;
  initiated_by: 'aff' | 'neg';
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type CellColor = 'yellow' | 'green' | 'blue' | null;

export interface FlowAnalytics {
  id: string;
  user_id: string;
  flow_id: string;
  notes_aff: string;
  notes_neg: string;
  created_at: string;
  updated_at: string;
}

export interface RoundAnalytics {
  id: string;
  user_id: string;
  round_id: string;
  notes_aff: string;
  notes_neg: string;
  notes_decision?: string;
  created_at: string;
  updated_at: string;
}

export interface FlowCell {
  id: string;
  user_id: string;
  flow_id: string;
  column_index: number;
  row_index: number;
  content: string;
  color: CellColor;
  created_at: string;
  updated_at: string;
}

/** Column labels in speech order */
export const SPEECH_COLUMNS = [
  '1AC', '1NC', '2AC', '2NC', '1NR', '1AR', '2NR', '2AR',
] as const;

export type SpeechColumn = (typeof SPEECH_COLUMNS)[number];

/** Column metadata */
export const COLUMN_META: Record<SpeechColumn, { side: 'aff' | 'neg'; minutes: number }> = {
  '1AC': { side: 'aff', minutes: 8 },
  '1NC': { side: 'neg', minutes: 8 },
  '2AC': { side: 'aff', minutes: 8 },
  '2NC': { side: 'neg', minutes: 8 },
  '1NR': { side: 'neg', minutes: 5 },
  '1AR': { side: 'aff', minutes: 5 },
  '2NR': { side: 'neg', minutes: 5 },
  '2AR': { side: 'aff', minutes: 5 },
};
