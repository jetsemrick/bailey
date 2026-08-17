import { describe, it, expect } from 'vitest';
import { copyCells, pasteCells, createClipboardSnapshot } from './flowClipboard';
import { selectSingleCell, toggleCell } from './flowSelection';
import type { CellColor } from '../db/types';

describe('flowClipboard', () => {
  const mockGetContent = (col: number, row: number) => `C${col}R${row}`;
  const mockGetColor = (col: number, row: number): CellColor => (row % 2 === 0 ? 'yellow' : null);
  const mockGetComment = (col: number, row: number) => (row === 0 ? 'comment' : '');

  describe('copyCells', () => {
    it('should copy a single cell', () => {
      const selection = selectSingleCell(1, 2);
      const clipboard = copyCells(selection, mockGetContent, mockGetColor, mockGetComment);
      
      expect(clipboard).not.toBeNull();
      expect(clipboard!.cells).toHaveLength(1);
      expect(clipboard!.cells[0]).toEqual({
        col: 1,
        row: 2,
        content: 'C1R2',
        color: 'yellow',
        comment: '',
      });
      expect(clipboard!.topLeft).toEqual({ col: 1, row: 2 });
    });

    it('should copy multiple cells', () => {
      let selection = selectSingleCell(1, 2);
      selection = toggleCell(selection, 1, 3);
      selection = toggleCell(selection, 2, 2);
      
      const clipboard = copyCells(selection, mockGetContent, mockGetColor, mockGetComment);
      
      expect(clipboard).not.toBeNull();
      expect(clipboard!.cells).toHaveLength(3);
      expect(clipboard!.topLeft).toEqual({ col: 1, row: 2 });
    });

    it('should capture top-left corner correctly', () => {
      let selection = selectSingleCell(5, 10);
      selection = toggleCell(selection, 2, 3);
      selection = toggleCell(selection, 3, 7);
      
      const clipboard = copyCells(selection, mockGetContent, mockGetColor, mockGetComment);
      
      expect(clipboard!.topLeft).toEqual({ col: 2, row: 3 });
    });

    it('should return null for empty selection', () => {
      const selection = { primaryCell: null, selectedCells: new Set<string>() };
      const clipboard = copyCells(selection, mockGetContent, mockGetColor, mockGetComment);
      
      expect(clipboard).toBeNull();
    });
  });

  describe('pasteCells', () => {
    it('should paste single cell at anchor', () => {
      const clipboard = {
        cells: [
          { col: 1, row: 2, content: 'test', color: 'yellow' as CellColor, comment: 'note' },
        ],
        topLeft: { col: 1, row: 2 },
      };
      
      const updates = pasteCells(clipboard, { col: 3, row: 4 });
      
      expect(updates).toHaveLength(1);
      expect(updates[0]).toEqual({
        col: 3,
        row: 4,
        content: 'test',
        color: 'yellow',
        comment: 'note',
      });
    });

    it('should paste multiple cells with relative offsets', () => {
      const clipboard = {
        cells: [
          { col: 1, row: 2, content: 'A', color: null, comment: '' },
          { col: 1, row: 3, content: 'B', color: 'yellow' as CellColor, comment: '' },
          { col: 2, row: 2, content: 'C', color: null, comment: 'note' },
        ],
        topLeft: { col: 1, row: 2 },
      };
      
      const updates = pasteCells(clipboard, { col: 5, row: 10 });
      
      expect(updates).toHaveLength(3);
      expect(updates).toEqual(
        expect.arrayContaining([
          { col: 5, row: 10, content: 'A', color: null, comment: '' },
          { col: 5, row: 11, content: 'B', color: 'yellow', comment: '' },
          { col: 6, row: 10, content: 'C', color: null, comment: 'note' },
        ])
      );
    });
  });

  describe('createClipboardSnapshot', () => {
    it('should create a snapshot from cell array', () => {
      const cells = [
        { col: 2, row: 3, content: 'A', color: null as CellColor, comment: '' },
        { col: 2, row: 4, content: 'B', color: 'yellow' as CellColor, comment: 'note' },
      ];
      
      const snapshot = createClipboardSnapshot(cells);
      
      expect(snapshot).not.toBeNull();
      expect(snapshot!.topLeft).toEqual({ col: 2, row: 3 });
      expect(snapshot!.cells).toHaveLength(2);
    });

    it('should return null for empty array', () => {
      const snapshot = createClipboardSnapshot([]);
      expect(snapshot).toBeNull();
    });
  });
});
