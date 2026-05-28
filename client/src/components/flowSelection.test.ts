import { describe, expect, test } from 'vitest';
import {
  cellId,
  parseCellId,
  selectSingleCell,
  toggleCellInSelection,
  selectedRowsInColumn,
  selectionIsSingleColumn,
  sortCells,
} from './flowSelection';

describe('flowSelection', () => {
  test('cellId and parseCellId round-trip', () => {
    expect(cellId(2, 5)).toBe('2:5');
    expect(parseCellId('2:5')).toEqual({ col: 2, row: 5 });
    expect(parseCellId('bad')).toBeNull();
  });

  test('selectSingleCell creates one id', () => {
    const { primaryCell, selectedIds } = selectSingleCell({ col: 1, row: 3 });
    expect(primaryCell).toEqual({ col: 1, row: 3 });
    expect(selectedIds).toEqual(new Set(['1:3']));
  });

  test('toggleCellInSelection adds and removes cells', () => {
    const a = selectSingleCell({ col: 0, row: 0 });
    const b = toggleCellInSelection(a.primaryCell, a.selectedIds, { col: 0, row: 2 });
    expect(b.selectedIds.has('0:0')).toBe(true);
    expect(b.selectedIds.has('0:2')).toBe(true);
    const c = toggleCellInSelection(b.primaryCell, b.selectedIds, { col: 0, row: 0 });
    expect(c.selectedIds.has('0:0')).toBe(false);
    expect(c.selectedIds.has('0:2')).toBe(true);
    expect(c.primaryCell).toEqual({ col: 0, row: 2 });
  });

  test('sortCells orders by column then row', () => {
    expect(sortCells([{ col: 2, row: 1 }, { col: 1, row: 5 }, { col: 1, row: 2 }])).toEqual([
      { col: 1, row: 2 },
      { col: 1, row: 5 },
      { col: 2, row: 1 },
    ]);
  });

  test('selectedRowsInColumn and selectionIsSingleColumn', () => {
    const ids = new Set(['1:2', '1:5', '2:3']);
    expect(selectedRowsInColumn(ids, 1)).toEqual([2, 5]);
    expect(selectionIsSingleColumn(ids, 1)).toBe(false);
    expect(selectionIsSingleColumn(new Set(['1:2', '1:5']), 1)).toBe(true);
  });
});
