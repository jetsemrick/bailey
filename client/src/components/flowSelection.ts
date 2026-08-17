/**
 * Multi-cell selection helpers for the flow grid.
 * 
 * Selection model:
 * - primaryCell: the main cell (receives paste, initiates operations)
 * - selectedCells: Set of cell IDs (col:row) including the primary
 * - Cmd/Ctrl-click toggles cells in the selection set
 * - Plain click selects only one cell (becomes the new primary)
 */

export interface CellCoord {
  col: number;
  row: number;
}

export interface SelectionState {
  primaryCell: CellCoord | null;
  selectedCells: Set<string>;
}

export function cellKey(col: number, row: number): string {
  return `${col}:${row}`;
}

export function parseCellKey(key: string): CellCoord | null {
  const parts = key.split(':');
  if (parts.length !== 2) return null;
  const col = parseInt(parts[0], 10);
  const row = parseInt(parts[1], 10);
  if (isNaN(col) || isNaN(row)) return null;
  return { col, row };
}

export function createEmptySelection(): SelectionState {
  return {
    primaryCell: null,
    selectedCells: new Set(),
  };
}

export function selectSingleCell(col: number, row: number): SelectionState {
  return {
    primaryCell: { col, row },
    selectedCells: new Set([cellKey(col, row)]),
  };
}

export function toggleCell(
  selection: SelectionState,
  col: number,
  row: number
): SelectionState {
  const key = cellKey(col, row);
  const newSelected = new Set(selection.selectedCells);
  
  if (newSelected.has(key)) {
    newSelected.delete(key);
    // If we removed the primary cell, pick a new primary from the remaining selection
    if (selection.primaryCell?.col === col && selection.primaryCell?.row === row) {
      const remaining = Array.from(newSelected);
      if (remaining.length > 0) {
        const newPrimary = parseCellKey(remaining[0]);
        return {
          primaryCell: newPrimary,
          selectedCells: newSelected,
        };
      } else {
        return createEmptySelection();
      }
    }
  } else {
    newSelected.add(key);
  }
  
  return {
    primaryCell: selection.primaryCell || { col, row },
    selectedCells: newSelected,
  };
}

export function isSelected(selection: SelectionState, col: number, row: number): boolean {
  return selection.selectedCells.has(cellKey(col, row));
}

export function isPrimaryCell(selection: SelectionState, col: number, row: number): boolean {
  return selection.primaryCell?.col === col && selection.primaryCell?.row === row;
}

export function getSelectedCells(selection: SelectionState): CellCoord[] {
  return Array.from(selection.selectedCells)
    .map(parseCellKey)
    .filter((coord): coord is CellCoord => coord !== null);
}

export function getSelectionCount(selection: SelectionState): number {
  return selection.selectedCells.size;
}

export function clearSelection(): SelectionState {
  return createEmptySelection();
}

export function filterSelectionByColumn(
  selection: SelectionState,
  col: number
): CellCoord[] {
  return getSelectedCells(selection)
    .filter(cell => cell.col === col)
    .sort((a, b) => a.row - b.row);
}

export function isContiguousInColumn(cells: CellCoord[]): boolean {
  if (cells.length <= 1) return true;
  for (let i = 1; i < cells.length; i++) {
    if (cells[i].row !== cells[i - 1].row + 1) {
      return false;
    }
  }
  return true;
}

export function allSelectedInSameColumn(selection: SelectionState): boolean {
  const cells = getSelectedCells(selection);
  if (cells.length === 0) return false;
  const firstCol = cells[0].col;
  return cells.every(cell => cell.col === firstCol);
}
