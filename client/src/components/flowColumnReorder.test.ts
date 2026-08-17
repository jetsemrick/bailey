import { describe, it, expect } from 'vitest';
import { reorderColumn, canMultiDrag, getMultiDragCells, type CellData } from './flowColumnReorder';
import type { CellColor } from '../db/types';

describe('flowColumnReorder', () => {
  describe('reorderColumn', () => {
    it('should reorder single cell', () => {
      const columnData: CellData[] = [
        { row: 0, content: 'A', color: null, comment: '' },
        { row: 1, content: 'B', color: null, comment: '' },
        { row: 2, content: 'C', color: null, comment: '' },
      ];
      
      const reordered = reorderColumn(columnData, [0], 2);
      
      expect(reordered.map(c => c.content)).toEqual(['B', 'C', 'A']);
      expect(reordered.map(c => c.row)).toEqual([0, 1, 2]);
    });

    it('should reorder contiguous block down', () => {
      const columnData: CellData[] = [
        { row: 0, content: 'A', color: null, comment: '' },
        { row: 1, content: 'B', color: null, comment: '' },
        { row: 2, content: 'C', color: null, comment: '' },
        { row: 3, content: 'D', color: null, comment: '' },
      ];
      
      const reordered = reorderColumn(columnData, [0, 1], 3);
      
      expect(reordered.map(c => c.content)).toEqual(['C', 'D', 'A', 'B']);
      expect(reordered.map(c => c.row)).toEqual([0, 1, 2, 3]);
    });

    it('should reorder contiguous block up', () => {
      const columnData: CellData[] = [
        { row: 0, content: 'A', color: null, comment: '' },
        { row: 1, content: 'B', color: null, comment: '' },
        { row: 2, content: 'C', color: null, comment: '' },
        { row: 3, content: 'D', color: null, comment: '' },
      ];
      
      const reordered = reorderColumn(columnData, [2, 3], 0);
      
      expect(reordered.map(c => c.content)).toEqual(['C', 'D', 'A', 'B']);
      expect(reordered.map(c => c.row)).toEqual([0, 1, 2, 3]);
    });

    it('should preserve cell data including colors and comments', () => {
      const columnData: CellData[] = [
        { row: 0, content: 'A', color: 'yellow' as CellColor, comment: 'note1' },
        { row: 1, content: 'B', color: null, comment: '' },
        { row: 2, content: 'C', color: 'green' as CellColor, comment: 'note2' },
      ];
      
      const reordered = reorderColumn(columnData, [0], 2);
      
      expect(reordered[2].content).toBe('A');
      expect(reordered[2].color).toBe('yellow');
      expect(reordered[2].comment).toBe('note1');
    });
  });

  describe('canMultiDrag', () => {
    it('should return true when all cells in same column', () => {
      const cells = [
        { col: 1, row: 2 },
        { col: 1, row: 3 },
        { col: 1, row: 4 },
      ];
      expect(canMultiDrag(cells, 1)).toBe(true);
    });

    it('should return false when cells in different columns', () => {
      const cells = [
        { col: 1, row: 2 },
        { col: 2, row: 3 },
      ];
      expect(canMultiDrag(cells, 1)).toBe(false);
    });

    it('should return false when dragging from different column', () => {
      const cells = [
        { col: 1, row: 2 },
        { col: 1, row: 3 },
      ];
      expect(canMultiDrag(cells, 2)).toBe(false);
    });
  });

  describe('getMultiDragCells', () => {
    it('should get sorted row indices for column', () => {
      const cells = [
        { col: 1, row: 5 },
        { col: 1, row: 2 },
        { col: 2, row: 3 },
        { col: 1, row: 4 },
      ];
      
      const rows = getMultiDragCells(cells, 1);
      expect(rows).toEqual([2, 4, 5]);
    });

    it('should return empty array when no cells in column', () => {
      const cells = [
        { col: 2, row: 3 },
        { col: 3, row: 4 },
      ];
      
      const rows = getMultiDragCells(cells, 1);
      expect(rows).toEqual([]);
    });
  });
});
