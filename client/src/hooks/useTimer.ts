import { useState, useCallback, useRef, useEffect } from 'react';

export type TimerPreset = 'constructive' | 'rebuttal' | 'crossex' | 'prep';

const PRESET_SECONDS: Record<TimerPreset, number> = {
  constructive: 8 * 60,
  rebuttal: 5 * 60,
  crossex: 3 * 60,
  prep: 10 * 60,
};

export interface PrepTime {
  aff: number; // remaining seconds
  neg: number;
}

export function useTimer() {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [expired, setExpired] = useState(false);
  const [activePreset, setActivePreset] = useState<TimerPreset | null>(null);
  const [prepTime, setPrepTime] = useState<PrepTime>({ aff: 10 * 60, neg: 10 * 60 });
  const [prepSide, setPrepSide] = useState<'aff' | 'neg'>('aff');

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const playBeep = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Audio not available
    }
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRunning(false);
  }, []);

  const tick = useCallback(() => {
    setSecondsLeft((prev) => {
      if (prev <= 1) {
        stop();
        setExpired(true);
        playBeep();

        // Deduct from prep if active
        if (activePreset === 'prep') {
          setPrepTime((pt) => ({
            ...pt,
            [prepSide]: Math.max(0, pt[prepSide] - totalSeconds),
          }));
        }
        return 0;
      }
      return prev - 1;
    });
  }, [stop, playBeep, activePreset, prepSide, totalSeconds]);

  const start = useCallback(() => {
    if (secondsLeft <= 0 || running) return;
    setExpired(false);
    setRunning(true);
    intervalRef.current = setInterval(tick, 1000);
  }, [secondsLeft, running, tick]);

  const pause = useCallback(() => {
    stop();
    // If prep, deduct elapsed time
    if (activePreset === 'prep') {
      const elapsed = totalSeconds - secondsLeft;
      if (elapsed > 0) {
        setPrepTime((pt) => ({
          ...pt,
          [prepSide]: Math.max(0, pt[prepSide] - elapsed),
        }));
        setTotalSeconds(secondsLeft);
      }
    }
  }, [stop, activePreset, prepSide, totalSeconds, secondsLeft]);

  const reset = useCallback(() => {
    stop();
    setSecondsLeft(totalSeconds);
    setExpired(false);
  }, [stop, totalSeconds]);

  const setPreset = useCallback(
    (preset: TimerPreset) => {
      stop();
      setActivePreset(preset);
      const secs = preset === 'prep' ? prepTime[prepSide] : PRESET_SECONDS[preset];
      setTotalSeconds(secs);
      setSecondsLeft(secs);
      setExpired(false);
    },
    [stop, prepTime, prepSide]
  );

  const setCustomTime = useCallback(
    (seconds: number) => {
      stop();
      setActivePreset(null);
      setTotalSeconds(seconds);
      setSecondsLeft(seconds);
      setExpired(false);
    },
    [stop]
  );

  const switchPrepSide = useCallback(
    (side: 'aff' | 'neg') => {
      setPrepSide(side);
      if (activePreset === 'prep' && !running) {
        setTotalSeconds(prepTime[side]);
        setSecondsLeft(prepTime[side]);
      }
    },
    [activePreset, running, prepTime]
  );

  const setInitialPrepTime = useCallback((seconds: number) => {
    setPrepTime({ aff: seconds, neg: seconds });
  }, []);

  return {
    secondsLeft,
    totalSeconds,
    running,
    expired,
    activePreset,
    prepTime,
    prepSide,
    start,
    pause,
    reset,
    setPreset,
    setCustomTime,
    switchPrepSide,
    setInitialPrepTime,
  };
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
