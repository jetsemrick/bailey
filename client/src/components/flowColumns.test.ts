import { describe, expect, test } from 'vitest';
import { SPEECH_COLUMNS } from '../db/types';

/** Mirrors FlowGrid getColumnsForFlow for CX (aff-like full grid). */
function getColumnsForFlow(
  initiatedBy: 'aff' | 'neg' | null,
  tabKind: 'standard' | 'cx' = 'standard'
): { label: string; dataCol: number }[] {
  const effective = tabKind === 'cx' ? 'aff' : initiatedBy;
  const all = SPEECH_COLUMNS.map((label, i) => ({ label, dataCol: i }));
  if (effective === 'neg') {
    return all.filter((c) => c.label !== '1AC');
  }
  return all;
}

describe('getColumnsForFlow CX', () => {
  test('CX uses full 8 columns like aff', () => {
    const cx = getColumnsForFlow('neg', 'cx');
    expect(cx.length).toBe(8);
    expect(cx.map((c) => c.label)).toContain('1AC');
  });

  test('standard neg omits 1AC', () => {
    const neg = getColumnsForFlow('neg', 'standard');
    expect(neg.map((c) => c.label)).not.toContain('1AC');
  });
});
