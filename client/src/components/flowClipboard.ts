/**
 * Clipboard operations for multi-cell copy/paste.
 * 
 * Copy captures content, color, and comments from selected cells.
 * Paste applies the copied block relative to the primary cell (paste anchor).
 */

import type { CellColor } from '../db/types';
import type { CellCoord, SelectionState } from './flowSelection';
import { getSelectedCells, parseCellKey } from './flowSelection';

export interface CellSnapshot {
  col: number;
  row: number;
  content: string;
  color: CellColor;
  comment: string;
}

export interface ClipboardData {
  cells: CellSnapshot[];
  topLeft: CellCoord;
}

export function copyCells(
  selection: SelectionState,
  getCellContent: (col: number, row: number) => string,
  getCellColor: (col: number, row: number) => CellColor,
  getCellComment: (col: number, row: number) => string
): ClipboardData | null {
  const cells = getSelectedCells(selection);
  if (cells.length === 0) return null;

  // Find top-left corner
  let minCol = Infinity;
  let minRow = Infinity;
  for (const cell of cells) {
    if (cell.col < minCol) minCol = cell.col;
    if (cell.row < minRow) minRow = cell.row;
  }

  // Capture snapshots
  const snapshots: CellSnapshot[] = cells.map(cell => ({
    col: cell.col,
    row: cell.row,
    content: getCellContent(cell.col, cell.row),
    color: getCellColor(cell.col, cell.row),
    comment: getCellComment(cell.col, cell.row),
  }));

  return {
    cells: snapshots,
    topLeft: { col: minCol, row: minRow },
  };
}

export function pasteCells(
  clipboard: ClipboardData,
  pasteAnchor: CellCoord
): Array<{
  col: number;
  row: number;
  content: string;
  color: CellColor;
  comment: string;
}> {
  const updates: Array<{
    col: number;
    row: number;
    content: string;
    color: CellColor;
    comment: string;
  }> = [];

  for (const snapshot of clipboard.cells) {
    const offsetCol = snapshot.col - clipboard.topLeft.col;
    const offsetRow = snapshot.row - clipboard.topLeft.row;
    updates.push({
      col: pasteAnchor.col + offsetCol,
      row: pasteAnchor.row + offsetRow,
      content: snapshot.content,
      color: snapshot.color,
      comment: snapshot.comment,
    });
  }

  return updates;
}

export function createClipboardSnapshot(
  cells: Array<{
    col: number;
    row: number;
    content: string;
    color: CellColor;
    comment: string;
  }>
): ClipboardData | null {
  if (cells.length === 0) return null;
  
  let minCol = Infinity;
  let minRow = Infinity;
  for (const cell of cells) {
    if (cell.col < minCol) minCol = cell.col;
    if (cell.row < minRow) minRow = cell.row;
  }

  return {
    cells: cells,
    topLeft: { col: minCol, row: minRow },
  };
}
