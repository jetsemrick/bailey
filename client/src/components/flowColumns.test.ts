import { describe, expect, test } from 'vitest';
import {
  getColumnsForFlow,
  LEGACY_1NR_DATA_COL,
  NEGATIVE_BLOCK_DATA_COL,
  NEGATIVE_BLOCK_LABEL,
} from '../lib/flowColumns';

describe('getColumnsForFlow', () => {
  test('standard aff sheets consolidate 2NC and 1NR into one Block column', () => {
    const columns = getColumnsForFlow('aff', 'standard');
    expect(columns.map((c) => c.label)).toEqual([
      '1AC',
      '1NC',
      '2AC',
      NEGATIVE_BLOCK_LABEL,
      '1AR',
      '2NR',
      '2AR',
    ]);
    expect(columns.find((c) => c.label === NEGATIVE_BLOCK_LABEL)?.dataCol).toBe(NEGATIVE_BLOCK_DATA_COL);
    expect(columns.map((c) => c.dataCol)).not.toContain(LEGACY_1NR_DATA_COL);
  });

  test('standard neg sheets omit 1AC and still consolidate the Negative block', () => {
    const columns = getColumnsForFlow('neg', 'standard');
    expect(columns.map((c) => c.label)).toEqual([
      '1NC',
      '2AC',
      NEGATIVE_BLOCK_LABEL,
      '1AR',
      '2NR',
      '2AR',
    ]);
  });

  test('CX uses full 8 columns like aff', () => {
    const cx = getColumnsForFlow('neg', 'cx');
    expect(cx.length).toBe(8);
    expect(cx.map((c) => c.label)).toContain('1AC');
    expect(cx.map((c) => c.label)).toContain('1NR');
  });
});
