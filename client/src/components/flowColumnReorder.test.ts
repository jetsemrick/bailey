import { describe, expect, test } from 'vitest';
import type { CellColor } from '../db/types';
import { reorderColumnWithSelection, columnReorderToUpdates } from './flowColumnReorder';

function row(content: string) {
  return { content, color: null as CellColor, comment: '' };
}

describe('flowColumnReorder', () => {
  test('single row reorder moves one item', () => {
    const before = [row('a'), row('b'), row('c')];
    const after = reorderColumnWithSelection(before, [], 0, 2);
    expect(after?.map((r) => r.content)).toEqual(['b', 'c', 'a']);
  });

  test('multi-row block preserves relative order', () => {
    const before = [row('a'), row('b'), row('c'), row('d'), row('e')];
    const after = reorderColumnWithSelection(before, [1, 3], 3, 0);
    expect(after?.map((r) => r.content)).toEqual(['b', 'd', 'a', 'c', 'e']);
  });

  test('returns null when active equals target', () => {
    const before = [row('a'), row('b')];
    expect(reorderColumnWithSelection(before, [0], 1, 1)).toBeNull();
  });

  test('columnReorderToUpdates builds undo edits', () => {
    const before = [row('a'), row('b')];
    const after = [row('b'), row('a')];
    const { updates, edits } = columnReorderToUpdates(2, before, after);
    expect(updates).toHaveLength(2);
    expect(edits[0].previousContent).toBe('a');
    expect(edits[0].newContent).toBe('b');
  });
});
