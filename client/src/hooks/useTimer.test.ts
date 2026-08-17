import { describe, expect, test, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSingleTimer, formatTime, parseTimeInput } from './useTimer';

describe('formatTime', () => {
  test('formats seconds correctly', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(5)).toBe('0:05');
    expect(formatTime(59)).toBe('0:59');
    expect(formatTime(60)).toBe('1:00');
    expect(formatTime(61)).toBe('1:01');
    expect(formatTime(125)).toBe('2:05');
    expect(formatTime(480)).toBe('8:00');
  });
});

describe('parseTimeInput', () => {
  test('parses various time formats', () => {
    expect(parseTimeInput('0')).toBe(0);
    expect(parseTimeInput('5')).toBe(300);
    expect(parseTimeInput('8')).toBe(480);
    expect(parseTimeInput('8:00')).toBe(480);
    expect(parseTimeInput('8:30')).toBe(510);
    expect(parseTimeInput('0:30')).toBe(30);
    expect(parseTimeInput('  8:30  ')).toBe(510);
  });

  test('handles invalid input', () => {
    expect(parseTimeInput('')).toBe(0);
    expect(parseTimeInput('  ')).toBe(0);
    expect(parseTimeInput('abc')).toBe(0);
  });
});

describe('useSingleTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('initializes with correct seconds', () => {
    const { result } = renderHook(() => useSingleTimer(480));
    expect(result.current.secondsLeft).toBe(480);
    expect(result.current.totalSeconds).toBe(480);
    expect(result.current.running).toBe(false);
    expect(result.current.expired).toBe(false);
  });

  test('starts and counts down using deadline', () => {
    const { result } = renderHook(() => useSingleTimer(10));

    act(() => {
      result.current.start();
    });

    expect(result.current.running).toBe(true);
    expect(result.current.secondsLeft).toBe(10);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.secondsLeft).toBe(9);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.secondsLeft).toBe(6);
  });

  test('expires and beeps when reaching zero', () => {
    const { result } = renderHook(() => useSingleTimer(2));

    act(() => {
      result.current.start();
    });

    expect(result.current.running).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.secondsLeft).toBe(0);
    expect(result.current.running).toBe(false);
    expect(result.current.expired).toBe(true);
  });

  test('pause stops the timer', () => {
    const { result } = renderHook(() => useSingleTimer(10));

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.secondsLeft).toBe(8);

    act(() => {
      result.current.pause();
    });

    expect(result.current.running).toBe(false);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.secondsLeft).toBe(8);
  });

  test('reset restores to total seconds', () => {
    const { result } = renderHook(() => useSingleTimer(10));

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.secondsLeft).toBe(7);

    act(() => {
      result.current.reset();
    });

    expect(result.current.secondsLeft).toBe(10);
    expect(result.current.running).toBe(false);
    expect(result.current.expired).toBe(false);
  });

  test('setTime changes the total and current seconds', () => {
    const { result } = renderHook(() => useSingleTimer(10));

    act(() => {
      result.current.setTime(20);
    });

    expect(result.current.secondsLeft).toBe(20);
    expect(result.current.totalSeconds).toBe(20);
    expect(result.current.running).toBe(false);
  });

  test('deadline-based calculation handles simulated background drift', () => {
    const { result } = renderHook(() => useSingleTimer(60, { 
      persistenceKey: 'test-timer' 
    }));

    act(() => {
      result.current.start();
    });

    expect(result.current.running).toBe(true);
    expect(result.current.secondsLeft).toBe(60);

    act(() => {
      vi.advanceTimersByTime(35000);
    });

    expect(result.current.secondsLeft).toBe(25);
    expect(result.current.running).toBe(true);
  });

  test('persists and rehydrates with deadline', () => {
    const persistenceKey = 'test-persist-timer';
    const { result, unmount } = renderHook(() => 
      useSingleTimer(60, { persistenceKey })
    );

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.secondsLeft).toBe(55);

    unmount();

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    const { result: result2 } = renderHook(() =>
      useSingleTimer(60, { persistenceKey })
    );

    expect(result2.current.running).toBe(true);
    expect(result2.current.secondsLeft).toBeLessThanOrEqual(45);
    expect(result2.current.secondsLeft).toBeGreaterThanOrEqual(44);
  });

  test('backward compatibility: handles old persisted data without deadline', () => {
    const persistenceKey = 'test-old-format';
    
    const oldFormat = {
      secondsLeft: 50,
      totalSeconds: 60,
      running: true,
      savedAt: Date.now() - 10000,
    };
    sessionStorage.setItem(persistenceKey, JSON.stringify(oldFormat));

    const { result } = renderHook(() =>
      useSingleTimer(60, { persistenceKey })
    );

    expect(result.current.running).toBe(true);
    expect(result.current.secondsLeft).toBeLessThanOrEqual(40);
    expect(result.current.secondsLeft).toBeGreaterThanOrEqual(39);
  });
});
