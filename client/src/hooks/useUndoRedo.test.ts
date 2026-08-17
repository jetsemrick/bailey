import { describe, expect, test } from 'vitest';
import type { CellEdit, BatchEdit } from './useUndoRedo';

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

describe('BatchEdit shape', () => {
  test('contains array of edits', () => {
    const batch: BatchEdit = {
      edits: [
        {
          col: 0,
          row: 1,
          previousContent: 'A',
          newContent: 'B',
          previousColor: null,
          newColor: 'yellow',
          previousComment: '',
          newComment: 'note',
        },
        {
          col: 0,
          row: 2,
          previousContent: 'C',
          newContent: 'D',
          previousColor: 'green',
          newColor: null,
          previousComment: 'old',
          newComment: '',
        },
      ],
    };
    expect(batch.edits).toHaveLength(2);
    expect(batch.edits[0].col).toBe(0);
  });
});
