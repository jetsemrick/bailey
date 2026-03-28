import type { SpeechColumn, TimerPreset } from '../db/types';
import { SPEECH_COLUMNS } from '../db/types';

export type { TimerPreset };

/** Prep time is 10 minutes for both presets (DEB-29). */
export const PREP_SECONDS = 10 * 60;

const CONSTRUCTIVE: SpeechColumn[] = ['1AC', '1NC', '2AC', '2NC'];
const REBUTTAL: SpeechColumn[] = ['1NR', '1AR', '2NR', '2AR'];

export function normalizeTimerPreset(value: string | undefined | null): TimerPreset {
  return value === 'college' ? 'college' : 'high_school';
}

export function speechConstructiveSeconds(preset: TimerPreset): number {
  return preset === 'college' ? 9 * 60 : 8 * 60;
}

export function speechRebuttalSeconds(preset: TimerPreset): number {
  return preset === 'college' ? 6 * 60 : 5 * 60;
}

export function isRebuttalColumn(label: SpeechColumn): boolean {
  return (REBUTTAL as readonly string[]).includes(label);
}

/** Per-column speech lengths for UI (column headers, etc.). */
export function getColumnMetaForPreset(
  preset: TimerPreset
): Record<SpeechColumn, { side: 'aff' | 'neg'; minutes: number }> {
  const c = preset === 'college' ? 9 : 8;
  const r = preset === 'college' ? 6 : 5;
  const base: Record<SpeechColumn, { side: 'aff' | 'neg'; minutes: number }> = {} as Record<
    SpeechColumn,
    { side: 'aff' | 'neg'; minutes: number }
  >;
  for (const col of SPEECH_COLUMNS) {
    const side: 'aff' | 'neg' =
      col === '1AC' || col === '2AC' || col === '1AR' || col === '2AR' ? 'aff' : 'neg';
    const minutes = (CONSTRUCTIVE as readonly string[]).includes(col) ? c : r;
    base[col] = { side, minutes };
  }
  return base;
}
