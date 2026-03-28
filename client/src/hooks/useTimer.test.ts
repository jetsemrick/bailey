import { describe, expect, test, beforeEach } from 'vitest';

describe('useTimer persistence helpers', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  test('sessionStorage round-trip shape', () => {
    const key = 'bailey-debate-timer:test:affPrep';
    const payload = {
      secondsLeft: 300,
      totalSeconds: 600,
      running: false,
      savedAt: Date.now(),
    };
    sessionStorage.setItem(key, JSON.stringify(payload));
    const raw = sessionStorage.getItem(key);
    expect(raw).toBeTruthy();
    const p = JSON.parse(raw!);
    expect(p.secondsLeft).toBe(300);
    expect(p.totalSeconds).toBe(600);
  });
});
