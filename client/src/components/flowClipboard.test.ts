import { afterEach, describe, expect, it } from 'vitest';
import {
  attemptPaste,
  copyCells,
  copySourceKeysFromSelection,
  COPY_SOURCE_RING_OPACITY,
  createClipboardSnapshot,
  getFlowClipboardShortcut,
  isCopySourceCell,
  isFlowGridClipboardScope,
  isForeignClipboardTarget,
  nextCopySourceKeys,
  PASTE_BLOCKED_FLASH_MS,
  PASTE_BLOCKED_OPACITY,
  pasteCells,
  shouldFlashBlockedPaste,
  shouldHandleFlowClipboardShortcut,
} from './flowClipboard';
import { createEmptySelection, selectSingleCell, toggleCell } from './flowSelection';
import type { CellColor } from '../db/types';

describe('flowClipboard', () => {
  const mockGetContent = (col: number, row: number) => `C${col}R${row}`;
  const mockGetColor = (_col: number, row: number): CellColor => (row % 2 === 0 ? 'yellow' : null);
  const mockGetComment = (_col: number, row: number) => (row === 0 ? 'comment' : '');

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

    it('should preserve rich-text HTML already supported by cells', () => {
      const selection = selectSingleCell(0, 0);
      const clipboard = copyCells(
        selection,
        () => '<b>contention</b> <u>one</u> <mark data-color="yellow">card</mark>',
        () => null,
        () => ''
      );

      expect(clipboard!.cells[0].content).toBe(
        '<b>contention</b> <u>one</u> <mark data-color="yellow">card</mark>'
      );
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

    it('should paste rich-text content unchanged', () => {
      const clipboard = {
        cells: [
          {
            col: 0,
            row: 0,
            content: '<b>DA</b>',
            color: null as CellColor,
            comment: '',
          },
        ],
        topLeft: { col: 0, row: 0 },
      };

      const updates = pasteCells(clipboard, { col: 2, row: 5 });
      expect(updates[0].content).toBe('<b>DA</b>');
    });
  });

  describe('attemptPaste', () => {
    const clipboard = {
      cells: [{ col: 0, row: 0, content: 'A', color: null as CellColor, comment: '' }],
      topLeft: { col: 0, row: 0 },
    };

    it('should succeed with clipboard and a paste anchor', () => {
      const result = attemptPaste(clipboard, { col: 3, row: 1 });
      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.updates).toEqual([
          { col: 3, row: 1, content: 'A', color: null, comment: '' },
        ]);
      }
    });

    it('should block when clipboard is empty', () => {
      expect(attemptPaste(null, { col: 1, row: 1 })).toEqual({
        status: 'blocked',
        reason: 'empty-clipboard',
      });
      expect(attemptPaste({ cells: [], topLeft: { col: 0, row: 0 } }, { col: 1, row: 1 })).toEqual({
        status: 'blocked',
        reason: 'empty-clipboard',
      });
    });

    it('should block when there is no paste target', () => {
      expect(attemptPaste(clipboard, null)).toEqual({
        status: 'blocked',
        reason: 'no-target',
      });
    });

    it('should flash only for empty clipboard with a target cell', () => {
      expect(shouldFlashBlockedPaste(attemptPaste(null, { col: 0, row: 0 }), true)).toBe(true);
      expect(shouldFlashBlockedPaste(attemptPaste(clipboard, null), false)).toBe(false);
      expect(shouldFlashBlockedPaste(attemptPaste(clipboard, { col: 0, row: 0 }), true)).toBe(false);
      expect(PASTE_BLOCKED_FLASH_MS).toBe(120);
      expect(PASTE_BLOCKED_OPACITY).toBe(0.85);
      expect(COPY_SOURCE_RING_OPACITY).toBeGreaterThanOrEqual(0.35);
      expect(COPY_SOURCE_RING_OPACITY).toBeLessThanOrEqual(0.4);
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

  describe('copy-source ring state', () => {
    it('should mark copied cells after copy', () => {
      const selection = selectSingleCell(1, 2);
      const keys = nextCopySourceKeys(null, { type: 'copy', selection });
      expect(keys).toEqual(new Set(['1:2']));
      expect(isCopySourceCell(keys, 1, 2)).toBe(true);
      expect(isCopySourceCell(keys, 1, 3)).toBe(false);
    });

    it('should copy a multi-cell range', () => {
      let selection = selectSingleCell(0, 0);
      selection = toggleCell(selection, 0, 1);
      const keys = copySourceKeysFromSelection(selection);
      expect(keys).toEqual(new Set(['0:0', '0:1']));
    });

    it('should clear on successful paste, escape, or a new non-paste selection', () => {
      const current = new Set(['1:2']);
      expect(nextCopySourceKeys(current, { type: 'paste-success' })).toBeNull();
      expect(nextCopySourceKeys(current, { type: 'escape' })).toBeNull();
      expect(nextCopySourceKeys(current, { type: 'selection-change' })).toBeNull();
    });

    it('should keep the copy-source ring on blocked paste', () => {
      const current = new Set(['1:2']);
      expect(nextCopySourceKeys(current, { type: 'paste-blocked' })).toEqual(current);
    });

    it('should return null when copying an empty selection', () => {
      expect(nextCopySourceKeys(null, { type: 'copy', selection: createEmptySelection() })).toBeNull();
    });
  });
});

describe('flowClipboard keyboard gating', () => {
  let nodes: HTMLElement[] = [];

  afterEach(() => {
    for (const node of nodes) node.remove();
    nodes = [];
  });

  function mount(tag: string, parent?: HTMLElement) {
    const el = document.createElement(tag);
    (parent ?? document.body).appendChild(el);
    nodes.push(el);
    return el;
  }

  function event(partial: {
    key?: string;
    code?: string;
    metaKey?: boolean;
    ctrlKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
    target?: EventTarget | null;
  }) {
    return {
      key: 'c',
      metaKey: true,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      target: document.body,
      ...partial,
    };
  }

  it('maps Cmd/Ctrl+C to copy and Cmd/Ctrl+V to paste', () => {
    expect(getFlowClipboardShortcut({ key: 'c', metaKey: true, ctrlKey: false })).toBe('copy');
    expect(getFlowClipboardShortcut({ key: 'C', metaKey: false, ctrlKey: true })).toBe('copy');
    expect(getFlowClipboardShortcut({ key: 'v', metaKey: true, ctrlKey: false })).toBe('paste');
    expect(getFlowClipboardShortcut({ key: 'v', metaKey: false, ctrlKey: true })).toBe('paste');
  });

  it('does not treat Cmd/Ctrl+P as paste', () => {
    expect(getFlowClipboardShortcut({ key: 'p', metaKey: true, ctrlKey: false })).toBeNull();
    expect(getFlowClipboardShortcut({ key: 'p', metaKey: false, ctrlKey: true })).toBeNull();
  });

  it('ignores unmodified, shifted, or alt clipboard keys', () => {
    expect(getFlowClipboardShortcut({ key: 'c', metaKey: false, ctrlKey: false })).toBeNull();
    expect(getFlowClipboardShortcut({ key: 'c', metaKey: true, ctrlKey: false, shiftKey: true })).toBeNull();
    expect(getFlowClipboardShortcut({ key: 'v', metaKey: true, ctrlKey: false, altKey: true })).toBeNull();
  });

  it('handles copy/paste when a cell is selected and focus is on the document body', () => {
    const grid = mount('div');
    const opts = { gridRoot: grid, isEditing: false, hasSelection: true };
    expect(shouldHandleFlowClipboardShortcut(event({ key: 'c', target: document.body }), opts)).toBe('copy');
    expect(shouldHandleFlowClipboardShortcut(event({ key: 'v', target: document.body }), opts)).toBe('paste');
  });

  it('handles copy/paste when the event target is inside the flow grid', () => {
    const grid = mount('div');
    const cell = mount('div', grid);
    const opts = { gridRoot: grid, isEditing: false, hasSelection: true };
    expect(shouldHandleFlowClipboardShortcut(event({ key: 'c', target: cell }), opts)).toBe('copy');
  });

  it('does not steal Cmd/Ctrl+C/V from inputs outside the grid', () => {
    const grid = mount('div');
    const settingsInput = mount('input');
    const sidebarTextarea = mount('textarea');
    const authInput = mount('input');
    const opts = { gridRoot: grid, isEditing: false, hasSelection: true };

    expect(isForeignClipboardTarget(settingsInput, grid)).toBe(true);
    expect(
      shouldHandleFlowClipboardShortcut(event({ key: 'c', target: settingsInput }), opts)
    ).toBeNull();
    expect(
      shouldHandleFlowClipboardShortcut(event({ key: 'v', target: sidebarTextarea }), opts)
    ).toBeNull();
    expect(
      shouldHandleFlowClipboardShortcut(event({ key: 'c', target: authInput }), opts)
    ).toBeNull();
  });

  it('does not steal from a comment popover textarea even with a grid selection', () => {
    const grid = mount('div');
    const popover = mount('textarea');
    expect(
      shouldHandleFlowClipboardShortcut(event({ key: 'c', target: popover }), {
        gridRoot: grid,
        isEditing: false,
        hasSelection: true,
      })
    ).toBeNull();
  });

  it('does not steal from a focused control outside the grid (sidebar button)', () => {
    const grid = mount('div');
    const button = mount('button');
    expect(isFlowGridClipboardScope(button, grid)).toBe(false);
    expect(
      shouldHandleFlowClipboardShortcut(event({ key: 'c', target: button }), {
        gridRoot: grid,
        isEditing: false,
        hasSelection: true,
      })
    ).toBeNull();
  });

  it('does not handle shortcuts while a cell is being edited', () => {
    const grid = mount('div');
    const cell = mount('div', grid);
    cell.contentEditable = 'true';
    expect(
      shouldHandleFlowClipboardShortcut(event({ key: 'c', target: cell }), {
        gridRoot: grid,
        isEditing: true,
        hasSelection: true,
      })
    ).toBeNull();
  });

  it('does not handle shortcuts with no grid selection', () => {
    const grid = mount('div');
    expect(
      shouldHandleFlowClipboardShortcut(event({ key: 'c', target: document.body }), {
        gridRoot: grid,
        isEditing: false,
        hasSelection: false,
      })
    ).toBeNull();
  });

  it('does not handle Cmd/Ctrl+P as paste even when a cell is selected', () => {
    const grid = mount('div');
    expect(
      shouldHandleFlowClipboardShortcut(event({ key: 'p', target: document.body }), {
        gridRoot: grid,
        isEditing: false,
        hasSelection: true,
      })
    ).toBeNull();
  });

  it('does not handle shortcuts when the grid root is missing', () => {
    expect(
      shouldHandleFlowClipboardShortcut(event({ key: 'c', target: document.body }), {
        gridRoot: null,
        isEditing: false,
        hasSelection: true,
      })
    ).toBeNull();
  });
});
