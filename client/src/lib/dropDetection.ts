import { SPEECH_COLUMNS } from '../db/types';

export interface CellPosition {
  col: number;
  row: number;
}

export interface DropCandidate {
  col: number;
  row: number;
  content: string;
}

export function detectDrops(
  getCellContent: (col: number, row: number) => string,
  flowColumns: Array<{ dataCol: number }>,
  maxRows: number
): Set<string> {
  const droppedKeys = new Set<string>();

  for (let i = 0; i < flowColumns.length - 1; i++) {
    const currentCol = flowColumns[i].dataCol;
    const nextCol = flowColumns[i + 1].dataCol;

    for (let row = 0; row < maxRows; row++) {
      const currentContent = getCellContent(currentCol, row).trim();
      
      if (currentContent === '') {
        continue;
      }

      const nextContent = getCellContent(nextCol, row).trim();
      
      if (nextContent === '') {
        droppedKeys.add(`${currentCol}:${row}`);
      }
    }
  }

  return droppedKeys;
}

export function cellKey(col: number, row: number): string {
  return `${col}:${row}`;
}

export function isDropped(droppedKeys: Set<string> | null, col: number, row: number): boolean {
  if (!droppedKeys) return false;
  return droppedKeys.has(cellKey(col, row));
}
