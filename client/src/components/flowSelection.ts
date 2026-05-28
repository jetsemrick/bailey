export interface CellCoords {
  col: number;
  row: number;
}

export function cellId(col: number, row: number): string {
  return `${col}:${row}`;
}

export function parseCellId(id: string): CellCoords | null {
  const parts = id.split(':');
  if (parts.length !== 2) return null;
  const col = Number(parts[0]);
  const row = Number(parts[1]);
  if (!Number.isFinite(col) || !Number.isFinite(row)) return null;
  return { col, row };
}

export function sortCells(cells: CellCoords[]): CellCoords[] {
  return [...cells].sort((a, b) => {
    if (a.col !== b.col) return a.col - b.col;
    return a.row - b.row;
  });
}

export function cellsFromIds(ids: Iterable<string>): CellCoords[] {
  const cells: CellCoords[] = [];
  for (const id of ids) {
    const parsed = parseCellId(id);
    if (parsed) cells.push(parsed);
  }
  return sortCells(cells);
}

export function selectSingleCell(cell: CellCoords): {
  primaryCell: CellCoords;
  selectedIds: Set<string>;
} {
  const id = cellId(cell.col, cell.row);
  return { primaryCell: cell, selectedIds: new Set([id]) };
}

export function toggleCellInSelection(
  primaryCell: CellCoords | null,
  selectedIds: Set<string>,
  cell: CellCoords
): { primaryCell: CellCoords; selectedIds: Set<string> } {
  const id = cellId(cell.col, cell.row);
  const next = new Set(selectedIds);

  if (next.has(id)) {
    next.delete(id);
    if (next.size === 0) {
      return selectSingleCell(cell);
    }
    const remaining = cellsFromIds(next);
    const stillPrimary =
      primaryCell && next.has(cellId(primaryCell.col, primaryCell.row));
    return {
      primaryCell: stillPrimary ? primaryCell! : remaining[0],
      selectedIds: next,
    };
  }

  next.add(id);
  return { primaryCell: cell, selectedIds: next };
}

/** Selected rows in a column that belong to the selection set. */
export function selectedRowsInColumn(
  selectedIds: Set<string>,
  col: number
): number[] {
  const rows: number[] = [];
  for (const id of selectedIds) {
    const parsed = parseCellId(id);
    if (parsed && parsed.col === col) rows.push(parsed.row);
  }
  return rows.sort((a, b) => a - b);
}

/** True when every selected cell shares the same column as `col`. */
export function selectionIsSingleColumn(
  selectedIds: Set<string>,
  col: number
): boolean {
  for (const id of selectedIds) {
    const parsed = parseCellId(id);
    if (!parsed || parsed.col !== col) return false;
  }
  return selectedIds.size > 0;
}
