import { describe, expect, test } from 'vitest';
import {
  normalizeTimerPreset,
  speechConstructiveSeconds,
  speechRebuttalSeconds,
  getColumnMetaForPreset,
  PREP_SECONDS,
} from './timerPreset';

describe('timerPreset', () => {
  test('normalizeTimerPreset defaults to high school', () => {
    expect(normalizeTimerPreset(undefined)).toBe('high_school');
    expect(normalizeTimerPreset(null)).toBe('high_school');
    expect(normalizeTimerPreset('')).toBe('high_school');
  });

  test('normalizeTimerPreset recognizes college', () => {
    expect(normalizeTimerPreset('college')).toBe('college');
  });

  test('speech lengths by preset', () => {
    expect(speechConstructiveSeconds('high_school')).toBe(8 * 60);
    expect(speechRebuttalSeconds('high_school')).toBe(5 * 60);
    expect(speechConstructiveSeconds('college')).toBe(9 * 60);
    expect(speechRebuttalSeconds('college')).toBe(6 * 60);
    expect(PREP_SECONDS).toBe(10 * 60);
  });

  test('getColumnMetaForPreset maps constructives vs rebuttals', () => {
    const hs = getColumnMetaForPreset('high_school');
    expect(hs['1AC'].minutes).toBe(8);
    expect(hs['1NR'].minutes).toBe(5);
    const col = getColumnMetaForPreset('college');
    expect(col['2NC'].minutes).toBe(9);
    expect(col['2AR'].minutes).toBe(6);
  });
});
