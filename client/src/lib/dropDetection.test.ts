import { describe, it, expect } from 'vitest';
import { detectDrops, cellKey, isDropped } from './dropDetection';

describe('dropDetection', () => {
  describe('cellKey', () => {
    it('should create cell keys', () => {
      expect(cellKey(2, 5)).toBe('2:5');
      expect(cellKey(0, 0)).toBe('0:0');
      expect(cellKey(10, 20)).toBe('10:20');
    });
  });

  describe('isDropped', () => {
    it('should return false when droppedKeys is null', () => {
      expect(isDropped(null, 1, 2)).toBe(false);
    });

    it('should return true when cell is in droppedKeys', () => {
      const droppedKeys = new Set(['1:2', '3:4']);
      expect(isDropped(droppedKeys, 1, 2)).toBe(true);
      expect(isDropped(droppedKeys, 3, 4)).toBe(true);
    });

    it('should return false when cell is not in droppedKeys', () => {
      const droppedKeys = new Set(['1:2']);
      expect(isDropped(droppedKeys, 1, 3)).toBe(false);
      expect(isDropped(droppedKeys, 2, 2)).toBe(false);
    });
  });

  describe('detectDrops', () => {
    it('should detect no drops in empty grid', () => {
      const getCellContent = () => '';
      const flowColumns = [{ dataCol: 0 }, { dataCol: 1 }, { dataCol: 2 }];
      const maxRows = 10;

      const droppedKeys = detectDrops(getCellContent, flowColumns, maxRows);
      expect(droppedKeys.size).toBe(0);
    });

    it('should detect a single dropped argument', () => {
      const grid = new Map([
        ['0:0', 'Argument A'],
        ['1:0', ''],
      ]);
      const getCellContent = (col: number, row: number) =>
        grid.get(`${col}:${row}`) ?? '';
      const flowColumns = [{ dataCol: 0 }, { dataCol: 1 }];
      const maxRows = 5;

      const droppedKeys = detectDrops(getCellContent, flowColumns, maxRows);
      expect(droppedKeys.size).toBe(1);
      expect(droppedKeys.has('0:0')).toBe(true);
    });

    it('should not flag arguments with responses', () => {
      const grid = new Map([
        ['0:0', 'Argument A'],
        ['1:0', 'Response to A'],
      ]);
      const getCellContent = (col: number, row: number) =>
        grid.get(`${col}:${row}`) ?? '';
      const flowColumns = [{ dataCol: 0 }, { dataCol: 1 }];
      const maxRows = 5;

      const droppedKeys = detectDrops(getCellContent, flowColumns, maxRows);
      expect(droppedKeys.size).toBe(0);
    });

    it('should detect multiple drops in same column', () => {
      const grid = new Map([
        ['0:0', 'Argument A'],
        ['0:2', 'Argument B'],
        ['0:4', 'Argument C'],
        ['1:0', ''],
        ['1:2', ''],
        ['1:4', ''],
      ]);
      const getCellContent = (col: number, row: number) =>
        grid.get(`${col}:${row}`) ?? '';
      const flowColumns = [{ dataCol: 0 }, { dataCol: 1 }];
      const maxRows = 10;

      const droppedKeys = detectDrops(getCellContent, flowColumns, maxRows);
      expect(droppedKeys.size).toBe(3);
      expect(droppedKeys.has('0:0')).toBe(true);
      expect(droppedKeys.has('0:2')).toBe(true);
      expect(droppedKeys.has('0:4')).toBe(true);
    });

    it('should handle mixed responses correctly', () => {
      const grid = new Map([
        ['0:0', 'Argument A'],
        ['0:1', 'Argument B'],
        ['0:2', 'Argument C'],
        ['1:0', 'Response to A'],
        ['1:1', ''],
        ['1:2', 'Response to C'],
      ]);
      const getCellContent = (col: number, row: number) =>
        grid.get(`${col}:${row}`) ?? '';
      const flowColumns = [{ dataCol: 0 }, { dataCol: 1 }];
      const maxRows = 5;

      const droppedKeys = detectDrops(getCellContent, flowColumns, maxRows);
      expect(droppedKeys.size).toBe(1);
      expect(droppedKeys.has('0:1')).toBe(true);
    });

    it('should work across multiple speech columns', () => {
      const grid = new Map([
        ['0:0', 'Claim 1'],
        ['0:1', 'Claim 2'],
        ['1:0', 'Answer to Claim 1'],
        ['1:1', ''],
        ['2:0', ''],
        ['2:1', 'Extension of Claim 2'],
      ]);
      const getCellContent = (col: number, row: number) =>
        grid.get(`${col}:${row}`) ?? '';
      const flowColumns = [{ dataCol: 0 }, { dataCol: 1 }, { dataCol: 2 }];
      const maxRows = 5;

      const droppedKeys = detectDrops(getCellContent, flowColumns, maxRows);
      expect(droppedKeys.size).toBe(2);
      expect(droppedKeys.has('0:1')).toBe(true);
      expect(droppedKeys.has('1:0')).toBe(true);
    });

    it('should ignore whitespace-only cells', () => {
      const grid = new Map([
        ['0:0', 'Argument A'],
        ['1:0', '   '],
      ]);
      const getCellContent = (col: number, row: number) =>
        grid.get(`${col}:${row}`) ?? '';
      const flowColumns = [{ dataCol: 0 }, { dataCol: 1 }];
      const maxRows = 5;

      const droppedKeys = detectDrops(getCellContent, flowColumns, maxRows);
      expect(droppedKeys.size).toBe(1);
      expect(droppedKeys.has('0:0')).toBe(true);
    });

    it('should not check final column (no next column to respond)', () => {
      const grid = new Map([
        ['0:0', 'Argument A'],
        ['1:0', 'Response'],
        ['2:0', 'Final claim'],
      ]);
      const getCellContent = (col: number, row: number) =>
        grid.get(`${col}:${row}`) ?? '';
      const flowColumns = [{ dataCol: 0 }, { dataCol: 1 }, { dataCol: 2 }];
      const maxRows = 5;

      const droppedKeys = detectDrops(getCellContent, flowColumns, maxRows);
      expect(droppedKeys.size).toBe(0);
    });

    it('should handle neg flow omitting 1AC (skipped columns)', () => {
      const grid = new Map([
        ['1:0', 'Neg arg'],
        ['1:1', 'Neg arg 2'],
        ['2:0', 'Aff response'],
        ['2:1', ''],
      ]);
      const getCellContent = (col: number, row: number) =>
        grid.get(`${col}:${row}`) ?? '';
      const flowColumns = [{ dataCol: 1 }, { dataCol: 2 }];
      const maxRows = 5;

      const droppedKeys = detectDrops(getCellContent, flowColumns, maxRows);
      expect(droppedKeys.size).toBe(1);
      expect(droppedKeys.has('1:1')).toBe(true);
    });
  });
});
