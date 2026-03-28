import { useState, useCallback, useRef, useEffect } from 'react';

/** Persisted slice for DEB-31 (sessionStorage, survives browser tab close in-session). */
export interface PersistedTimerSlice {
  secondsLeft: number;
  totalSeconds: number;
  running: boolean;
  savedAt: number;
}

function readPersistedSlice(key: string): Omit<PersistedTimerSlice, 'savedAt'> & { savedAt: number } | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const p = JSON.parse(raw) as PersistedTimerSlice;
    if (
      typeof p.secondsLeft !== 'number' ||
      typeof p.totalSeconds !== 'number' ||
      typeof p.running !== 'boolean' ||
      typeof p.savedAt !== 'number'
    ) {
      return null;
    }
    const elapsedSec = Math.floor((Date.now() - p.savedAt) / 1000);
    const secondsLeft = p.running ? Math.max(0, p.secondsLeft - elapsedSec) : p.secondsLeft;
    return {
      secondsLeft,
      totalSeconds: p.totalSeconds,
      running: p.running && secondsLeft > 0,
      savedAt: p.savedAt,
    };
  } catch {
    return null;
  }
}

function writePersistedSlice(
  key: string,
  slice: { secondsLeft: number; totalSeconds: number; running: boolean }
) {
  try {
    const payload: PersistedTimerSlice = {
      ...slice,
      savedAt: Date.now(),
    };
    sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // quota / private mode
  }
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Parse "8:00", "8", "8:30" into seconds. Returns 0 if invalid. */
export function parseTimeInput(input: string): number {
  const trimmed = input.trim();
  if (!trimmed) return 0;
  const parts = trimmed.split(':');
  const m = parseInt(parts[0], 10) || 0;
  const s = parts.length > 1 ? parseInt(parts[1], 10) || 0 : 0;
  return Math.max(0, m * 60 + s);
}

export function useSingleTimer(
  initialSeconds: number,
  options?: { persistenceKey?: string | null }
) {
  const persistenceKey = options?.persistenceKey ?? null;

  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (!persistenceKey) return initialSeconds;
    const loaded = readPersistedSlice(persistenceKey);
    return loaded ? loaded.secondsLeft : initialSeconds;
  });
  const [totalSeconds, setTotalSeconds] = useState(() => {
    if (!persistenceKey) return initialSeconds;
    const loaded = readPersistedSlice(persistenceKey);
    return loaded ? loaded.totalSeconds : initialSeconds;
  });
  const [running, setRunning] = useState(() => {
    if (!persistenceKey) return false;
    const loaded = readPersistedSlice(persistenceKey);
    return loaded ? loaded.running : false;
  });
  const [expired, setExpired] = useState(false);

  // Re-hydrate when switching rounds / preset (key change only)
  useEffect(() => {
    if (!persistenceKey) return;
    const loaded = readPersistedSlice(persistenceKey);
    if (loaded) {
      setSecondsLeft(loaded.secondsLeft);
      setTotalSeconds(loaded.totalSeconds);
      setExpired(loaded.secondsLeft <= 0 && !loaded.running);
      setRunning(loaded.running && loaded.secondsLeft > 0);
    } else {
      setSecondsLeft(initialSeconds);
      setTotalSeconds(initialSeconds);
      setRunning(false);
      setExpired(false);
    }
  }, [persistenceKey, initialSeconds]);

  const playBeep = useCallback(() => {
    try {
      const ctx = new AudioContext();
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

  // One interval while running (DEB-31: survives remount via persisted running + this effect)
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          setExpired(true);
          playBeep();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, playBeep]);

  const stop = useCallback(() => {
    setRunning(false);
  }, []);

  const start = useCallback(() => {
    if (secondsLeft <= 0 || running) return;
    setExpired(false);
    setRunning(true);
  }, [secondsLeft, running]);

  // Persist to sessionStorage
  const persistThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!persistenceKey) return;
    const persist = () => {
      writePersistedSlice(persistenceKey, { secondsLeft, totalSeconds, running });
    };
    if (persistThrottleRef.current) clearTimeout(persistThrottleRef.current);
    persistThrottleRef.current = setTimeout(persist, running ? 400 : 0);
    return () => {
      if (persistThrottleRef.current) clearTimeout(persistThrottleRef.current);
    };
  }, [persistenceKey, secondsLeft, totalSeconds, running]);

  const pause = useCallback(() => {
    stop();
  }, [stop]);

  const reset = useCallback(() => {
    stop();
    setSecondsLeft(totalSeconds);
    setExpired(false);
  }, [stop, totalSeconds]);

  const setTime = useCallback((seconds: number) => {
    stop();
    const secs = Math.max(0, seconds);
    setTotalSeconds(secs);
    setSecondsLeft(secs);
    setExpired(false);
  }, [stop]);

  return {
    secondsLeft,
    totalSeconds,
    running,
    expired,
    start,
    pause,
    reset,
    setTime,
  };
}
