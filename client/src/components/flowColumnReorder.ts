import type { CellColor } from '../db/types';

export interface ColumnRowData {
  content: string;
  color: CellColor;
  comment: string;
}

/**
 * Reorder rows in a column when dragging `activeRow` to `targetRow`.
 * If `selectedRows` includes `activeRow`, moves the whole block preserving relative order.
 */
export function reorderColumnWithSelection(
  rows: ColumnRowData[],
  selectedRows: number[],
  activeRow: number,
  targetRow: number
): ColumnRowData[] | null {
  if (rows.length === 0) return null;
  if (activeRow < 0 || activeRow >= rows.length) return null;
  if (targetRow < 0 || targetRow >= rows.length) return null;
  if (activeRow === targetRow) return null;

  const selectedSet = new Set(
    selectedRows.length > 0 && selectedRows.includes(activeRow)
      ? selectedRows
      : [activeRow]
  );
  const blockIndices = [...selectedSet].sort((a, b) => a - b);
  const block = blockIndices.map((i) => rows[i]);

  const result = rows.slice();
  for (let i = blockIndices.length - 1; i >= 0; i--) {
    result.splice(blockIndices[i], 1);
  }

  // Match dnd-kit splice(fromRow,1) + splice(toRow,0,item) on the live array.
  const insertAt = Math.max(0, Math.min(targetRow, result.length));
  result.splice(insertAt, 0, ...block);
  return result;
}

/** Build bulk updates and undo edits from before/after column state. */
export function columnReorderToUpdates(
  col: number,
  before: ColumnRowData[],
  after: ColumnRowData[]
): {
  updates: {
    col: number;
    row: number;
    content: string;
    color: CellColor;
    comment: string;
  }[];
  edits: import('../hooks/useUndoRedo').CellEdit[];
} {
  const updates: {
    col: number;
    row: number;
    content: string;
    color: CellColor;
    comment: string;
  }[] = [];
  const edits: import('../hooks/useUndoRedo').CellEdit[] = [];

  const len = Math.max(before.length, after.length);
  for (let row = 0; row < len; row++) {
    const prev = before[row] ?? { content: '', color: null, comment: '' };
    const next = after[row] ?? { content: '', color: null, comment: '' };
    if (
      prev.content === next.content &&
      prev.color === next.color &&
      prev.comment === next.comment
    ) {
      continue;
    }
    edits.push({
      col,
      row,
      previousContent: prev.content,
      newContent: next.content,
      previousColor: prev.color,
      newColor: next.color,
      previousComment: prev.comment,
      newComment: next.comment,
    });
    updates.push({
      col,
      row,
      content: next.content,
      color: next.color,
      comment: next.comment,
    });
  }

  return { updates, edits };
}
