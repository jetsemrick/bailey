import { describe, expect, test } from 'vitest';
import { getColumnsForFlow, getSpeechDataCol, resolveSpeechDataColForFlow } from './flowColumns';

describe('getColumnsForFlow', () => {
  test('aff flows use Block as a singular column', () => {
    const aff = getColumnsForFlow('aff', 'standard');

    expect(aff.map((c) => c.label)).toEqual([
      '1AC',
      '1NC',
      '2AC',
      'Block',
      '1AR',
      '2NR',
      '2AR',
    ]);
    expect(aff.map((c) => c.dataCol)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  test('CX uses full 7 columns like aff', () => {
    const cx = getColumnsForFlow('neg', 'cx');
    expect(cx.length).toBe(7);
    expect(cx.map((c) => c.label)).toContain('1AC');
    expect(cx.map((c) => c.label)).toContain('Block');
  });

  test('standard neg omits 1AC', () => {
    const neg = getColumnsForFlow('neg', 'standard');
    expect(neg.map((c) => c.label)).not.toContain('1AC');
    expect(neg.map((c) => c.label)).toContain('Block');
    expect(neg.map((c) => c.dataCol)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('resolveSpeechDataColForFlow', () => {
  test('resolves exact columns for aff flows', () => {
    expect(resolveSpeechDataColForFlow('2NR', 'aff', 'standard')).toBe(getSpeechDataCol('2NR'));
  });

  test('falls back to the nearest visible column for standard neg flows', () => {
    expect(resolveSpeechDataColForFlow('1AC', 'neg', 'standard')).toBe(getSpeechDataCol('1NC'));
  });

  test('resolves exact columns for CX flows', () => {
    expect(resolveSpeechDataColForFlow('2AR', 'neg', 'cx')).toBe(getSpeechDataCol('2AR'));
  });
});
