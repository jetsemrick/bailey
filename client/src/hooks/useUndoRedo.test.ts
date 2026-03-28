import { describe, expect, test } from 'vitest';
import type { CellEdit } from './useUndoRedo';

describe('CellEdit shape', () => {
  test('includes comment fields for undo/redo', () => {
    const edit: CellEdit = {
      col: 0,
      row: 1,
      previousContent: 'hello',
      newContent: '',
      previousColor: 'yellow',
      newColor: null,
      previousComment: 'note',
      newComment: '',
    };
    expect(edit.previousComment).toBe('note');
    expect(edit.newComment).toBe('');
  });
});
