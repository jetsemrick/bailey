import { useState, useCallback, useRef, useEffect } from 'react';

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

export function useSingleTimer(initialSeconds: number) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);
  const [expired, setExpired] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        return 0;
      }
      return prev - 1;
    });
  }, [stop, playBeep]);

  const start = useCallback(() => {
    if (secondsLeft <= 0 || running) return;
    setExpired(false);
    setRunning(true);
    intervalRef.current = setInterval(tick, 1000);
  }, [secondsLeft, running, tick]);

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

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

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
