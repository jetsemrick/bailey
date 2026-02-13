export interface Tournament {
  id: string;
  user_id: string;
  name: string;
  date: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export interface Round {
  id: string;
  user_id: string;
  tournament_id: string;
  round_number: number;
  opponent: string;
  side: 'aff' | 'neg';
  result: 'W' | 'L' | null;
  created_at: string;
  updated_at: string;
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
