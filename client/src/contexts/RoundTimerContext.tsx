import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { TimerPreset } from '../db/types';

interface RoundTimerContextValue {
  timerPreset: TimerPreset;
  setTimerPreset: (preset: TimerPreset) => void;
}

const RoundTimerContext = createContext<RoundTimerContextValue | null>(null);

export function RoundTimerProvider({ children }: { children: ReactNode }) {
  const [timerPreset, setTimerPresetState] = useState<TimerPreset>('high_school');

  const setTimerPreset = useCallback((preset: TimerPreset) => {
    setTimerPresetState(preset);
  }, []);

  return (
    <RoundTimerContext.Provider value={{ timerPreset, setTimerPreset }}>
      {children}
    </RoundTimerContext.Provider>
  );
}

export function useRoundTimer(): RoundTimerContextValue {
  const ctx = useContext(RoundTimerContext);
  if (!ctx) {
    throw new Error('useRoundTimer must be used within RoundTimerProvider');
  }
  return ctx;
}

/** For Timer in Layout when outside provider (should not happen on /round routes). */
export function useRoundTimerOptional(): RoundTimerContextValue | null {
  return useContext(RoundTimerContext);
}
