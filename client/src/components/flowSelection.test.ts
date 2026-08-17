import { describe, it, expect } from 'vitest';
import {
  createEmptySelection,
  selectSingleCell,
  toggleCell,
  isSelected,
  isPrimaryCell,
  getSelectedCells,
  getSelectionCount,
  filterSelectionByColumn,
  isContiguousInColumn,
  allSelectedInSameColumn,
  cellKey,
  parseCellKey,
} from './flowSelection';

describe('flowSelection', () => {
  describe('cellKey and parseCellKey', () => {
    it('should create and parse cell keys', () => {
      const key = cellKey(2, 5);
      expect(key).toBe('2:5');
      
      const parsed = parseCellKey(key);
      expect(parsed).toEqual({ col: 2, row: 5 });
    });

    it('should return null for invalid keys', () => {
      expect(parseCellKey('invalid')).toBeNull();
      expect(parseCellKey('2:a')).toBeNull();
      expect(parseCellKey('2')).toBeNull();
    });
  });

  describe('createEmptySelection', () => {
    it('should create an empty selection', () => {
      const selection = createEmptySelection();
      expect(selection.primaryCell).toBeNull();
      expect(selection.selectedCells.size).toBe(0);
    });
  });

  describe('selectSingleCell', () => {
    it('should select a single cell', () => {
      const selection = selectSingleCell(1, 2);
      expect(selection.primaryCell).toEqual({ col: 1, row: 2 });
      expect(selection.selectedCells.size).toBe(1);
      expect(selection.selectedCells.has('1:2')).toBe(true);
    });
  });

  describe('toggleCell', () => {
    it('should add a cell to empty selection', () => {
      const empty = createEmptySelection();
      const selection = toggleCell(empty, 1, 2);
      expect(selection.selectedCells.has('1:2')).toBe(true);
      expect(selection.primaryCell).toEqual({ col: 1, row: 2 });
    });

    it('should add a cell to existing selection', () => {
      const initial = selectSingleCell(1, 2);
      const selection = toggleCell(initial, 1, 3);
      expect(selection.selectedCells.size).toBe(2);
      expect(selection.selectedCells.has('1:2')).toBe(true);
      expect(selection.selectedCells.has('1:3')).toBe(true);
      expect(selection.primaryCell).toEqual({ col: 1, row: 2 });
    });

    it('should remove a cell from selection', () => {
      let selection = selectSingleCell(1, 2);
      selection = toggleCell(selection, 1, 3);
      selection = toggleCell(selection, 1, 3);
      expect(selection.selectedCells.size).toBe(1);
      expect(selection.selectedCells.has('1:2')).toBe(true);
      expect(selection.selectedCells.has('1:3')).toBe(false);
    });

    it('should pick new primary when removing primary cell', () => {
      let selection = selectSingleCell(1, 2);
      selection = toggleCell(selection, 1, 3);
      selection = toggleCell(selection, 1, 2); // Remove primary
      expect(selection.selectedCells.size).toBe(1);
      expect(selection.selectedCells.has('1:3')).toBe(true);
      expect(selection.primaryCell).toEqual({ col: 1, row: 3 });
    });

    it('should return empty selection when removing last cell', () => {
      const selection = selectSingleCell(1, 2);
      const toggled = toggleCell(selection, 1, 2);
      expect(toggled.primaryCell).toBeNull();
      expect(toggled.selectedCells.size).toBe(0);
    });
  });

  describe('isSelected and isPrimaryCell', () => {
    it('should check if cell is selected', () => {
      const selection = selectSingleCell(1, 2);
      expect(isSelected(selection, 1, 2)).toBe(true);
      expect(isSelected(selection, 1, 3)).toBe(false);
    });

    it('should check if cell is primary', () => {
      const selection = selectSingleCell(1, 2);
      expect(isPrimaryCell(selection, 1, 2)).toBe(true);
      expect(isPrimaryCell(selection, 1, 3)).toBe(false);
    });
  });

  describe('getSelectedCells and getSelectionCount', () => {
    it('should get all selected cells', () => {
      let selection = selectSingleCell(1, 2);
      selection = toggleCell(selection, 1, 3);
      selection = toggleCell(selection, 2, 4);
      
      const cells = getSelectedCells(selection);
      expect(cells).toHaveLength(3);
      expect(cells).toEqual(
        expect.arrayContaining([
          { col: 1, row: 2 },
          { col: 1, row: 3 },
          { col: 2, row: 4 },
        ])
      );
    });

    it('should get selection count', () => {
      let selection = selectSingleCell(1, 2);
      expect(getSelectionCount(selection)).toBe(1);
      
      selection = toggleCell(selection, 1, 3);
      expect(getSelectionCount(selection)).toBe(2);
    });
  });

  describe('filterSelectionByColumn', () => {
    it('should filter cells by column', () => {
      let selection = selectSingleCell(1, 2);
      selection = toggleCell(selection, 1, 3);
      selection = toggleCell(selection, 2, 4);
      
      const col1Cells = filterSelectionByColumn(selection, 1);
      expect(col1Cells).toHaveLength(2);
      expect(col1Cells).toEqual([
        { col: 1, row: 2 },
        { col: 1, row: 3 },
      ]);
      
      const col2Cells = filterSelectionByColumn(selection, 2);
      expect(col2Cells).toHaveLength(1);
      expect(col2Cells).toEqual([{ col: 2, row: 4 }]);
    });

    it('should sort cells by row', () => {
      let selection = selectSingleCell(1, 5);
      selection = toggleCell(selection, 1, 2);
      selection = toggleCell(selection, 1, 3);
      
      const cells = filterSelectionByColumn(selection, 1);
      expect(cells.map(c => c.row)).toEqual([2, 3, 5]);
    });
  });

  describe('isContiguousInColumn', () => {
    it('should return true for contiguous cells', () => {
      const cells = [
        { col: 1, row: 2 },
        { col: 1, row: 3 },
        { col: 1, row: 4 },
      ];
      expect(isContiguousInColumn(cells)).toBe(true);
    });

    it('should return false for non-contiguous cells', () => {
      const cells = [
        { col: 1, row: 2 },
        { col: 1, row: 3 },
        { col: 1, row: 5 },
      ];
      expect(isContiguousInColumn(cells)).toBe(false);
    });

    it('should return true for single cell', () => {
      const cells = [{ col: 1, row: 2 }];
      expect(isContiguousInColumn(cells)).toBe(true);
    });

    it('should return true for empty array', () => {
      expect(isContiguousInColumn([])).toBe(true);
    });
  });

  describe('allSelectedInSameColumn', () => {
    it('should return true when all cells in same column', () => {
      let selection = selectSingleCell(1, 2);
      selection = toggleCell(selection, 1, 3);
      selection = toggleCell(selection, 1, 4);
      expect(allSelectedInSameColumn(selection)).toBe(true);
    });

    it('should return false when cells in different columns', () => {
      let selection = selectSingleCell(1, 2);
      selection = toggleCell(selection, 2, 3);
      expect(allSelectedInSameColumn(selection)).toBe(false);
    });

    it('should return false for empty selection', () => {
      const empty = createEmptySelection();
      expect(allSelectedInSameColumn(empty)).toBe(false);
    });
  });
});
