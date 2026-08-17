/**
 * Same-column multi-cell drag-and-drop reordering.
 * 
 * When dragging multiple selected cells within the same column,
 * they move as a contiguous block, preserving their relative order.
 */

import type { CellCoord } from './flowSelection';
import type { CellColor } from '../db/types';

export interface CellData {
  row: number;
  content: string;
  color: CellColor;
  comment: string;
}

export function reorderColumn(
  columnData: CellData[],
  fromRows: number[],
  toRow: number
): CellData[] {
  // Sort selected rows ascending
  const sortedFromRows = [...fromRows].sort((a, b) => a - b);
  
  // Extract the cells being moved
  const moving: CellData[] = [];
  const remaining: CellData[] = [];
  
  for (const cell of columnData) {
    if (sortedFromRows.includes(cell.row)) {
      moving.push(cell);
    } else {
      remaining.push(cell);
    }
  }
  
  // Find the insert position in the remaining array
  let insertIdx = 0;
  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i].row < toRow) {
      insertIdx = i + 1;
    }
  }
  
  // If dragging down, adjust insert position
  const minFromRow = Math.min(...sortedFromRows);
  if (toRow > minFromRow) {
    // Moving down - find position after target
    insertIdx = 0;
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].row <= toRow) {
        insertIdx = i + 1;
      }
    }
  }
  
  // Splice moving cells into remaining array
  const reordered = [
    ...remaining.slice(0, insertIdx),
    ...moving,
    ...remaining.slice(insertIdx),
  ];
  
  // Reassign row indices
  return reordered.map((cell, idx) => ({
    ...cell,
    row: idx,
  }));
}

export function canMultiDrag(
  selectedCells: CellCoord[],
  dragFromCol: number
): boolean {
  // All selected cells must be in the same column
  return selectedCells.every(cell => cell.col === dragFromCol);
}

export function getMultiDragCells(
  selectedCells: CellCoord[],
  col: number
): number[] {
  return selectedCells
    .filter(cell => cell.col === col)
    .map(cell => cell.row)
    .sort((a, b) => a - b);
}
