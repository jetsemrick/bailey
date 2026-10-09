export type CompactTimerId = 'speech' | 'affPrep' | 'negPrep';

export interface CompactTimerState {
  running: boolean;
  expired: boolean;
}

/**
 * Which timer the collapsed header control should display. A running timer wins
 * (speech first, then prep); otherwise an expired timer; otherwise speech.
 */
export function pickCompactTimer(timers: Record<CompactTimerId, CompactTimerState>): CompactTimerId {
  const order: CompactTimerId[] = ['speech', 'affPrep', 'negPrep'];
  return (
    order.find((id) => timers[id].running) ??
    order.find((id) => timers[id].expired) ??
    'speech'
  );
}

export const COMPACT_TIMER_LABEL: Record<CompactTimerId, string> = {
  speech: 'Speech',
  affPrep: 'Aff prep',
  negPrep: 'Neg prep',
};
