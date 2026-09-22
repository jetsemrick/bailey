/**
 * Clipboard operations for flow-grid copy/paste (DEB-32).
 *
 * Copy captures content, color, and comments from selected cells.
 * Paste applies the copied block relative to the primary cell (paste anchor).
 *
 * Keyboard shortcuts are grid-scoped: Cmd/Ctrl+C and Cmd/Ctrl+V must not steal
 * from settings, sidebar, auth, or other native inputs.
 */

import type { CellColor } from '../db/types';
import type { CellCoord, SelectionState } from './flowSelection';
import { cellKey, getSelectedCells, selectionsEqual } from './flowSelection';

export interface CellSnapshot {
  col: number;
  row: number;
  content: string;
  color: CellColor;
  comment: string;
}

export interface ClipboardData {
  cells: CellSnapshot[];
  topLeft: CellCoord;
}

export type PasteUpdate = {
  col: number;
  row: number;
  content: string;
  color: CellColor;
  comment: string;
};

export type PasteAttempt =
  | { status: 'success'; updates: PasteUpdate[] }
  | { status: 'blocked'; reason: 'empty-clipboard' | 'no-target' };

export type FlowClipboardShortcut = 'copy' | 'paste';

export type CopySourceEvent =
  | { type: 'copy'; selection: SelectionState }
  | { type: 'paste-success' }
  | { type: 'paste-blocked' }
  | { type: 'escape' }
  | { type: 'selection-change'; from: SelectionState; to: SelectionState };

/** Locked DEB-32 blocked-paste flash: 120ms opacity dip to ~0.85. */
export const PASTE_BLOCKED_FLASH_MS = 120;
export const PASTE_BLOCKED_OPACITY = 0.85;
/** Accent #F54E00 inner copy-source ring at ~38% opacity. */
export const COPY_SOURCE_RING_OPACITY = 0.38;

export function copyCells(
  selection: SelectionState,
  getCellContent: (col: number, row: number) => string,
  getCellColor: (col: number, row: number) => CellColor,
  getCellComment: (col: number, row: number) => string
): ClipboardData | null {
  const cells = getSelectedCells(selection);
  if (cells.length === 0) return null;

  let minCol = Infinity;
  let minRow = Infinity;
  for (const cell of cells) {
    if (cell.col < minCol) minCol = cell.col;
    if (cell.row < minRow) minRow = cell.row;
  }

  const snapshots: CellSnapshot[] = cells.map((cell) => ({
    col: cell.col,
    row: cell.row,
    content: getCellContent(cell.col, cell.row),
    color: getCellColor(cell.col, cell.row),
    comment: getCellComment(cell.col, cell.row),
  }));

  return {
    cells: snapshots,
    topLeft: { col: minCol, row: minRow },
  };
}

export function pasteCells(
  clipboard: ClipboardData,
  pasteAnchor: CellCoord
): PasteUpdate[] {
  const updates: PasteUpdate[] = [];

  for (const snapshot of clipboard.cells) {
    const offsetCol = snapshot.col - clipboard.topLeft.col;
    const offsetRow = snapshot.row - clipboard.topLeft.row;
    updates.push({
      col: pasteAnchor.col + offsetCol,
      row: pasteAnchor.row + offsetRow,
      content: snapshot.content,
      color: snapshot.color,
      comment: snapshot.comment,
    });
  }

  return updates;
}

export function attemptPaste(
  clipboard: ClipboardData | null,
  pasteAnchor: CellCoord | null
): PasteAttempt {
  if (!clipboard || clipboard.cells.length === 0) {
    return { status: 'blocked', reason: 'empty-clipboard' };
  }
  if (!pasteAnchor) {
    return { status: 'blocked', reason: 'no-target' };
  }
  return { status: 'success', updates: pasteCells(clipboard, pasteAnchor) };
}

export function createClipboardSnapshot(
  cells: Array<{
    col: number;
    row: number;
    content: string;
    color: CellColor;
    comment: string;
  }>
): ClipboardData | null {
  if (cells.length === 0) return null;

  let minCol = Infinity;
  let minRow = Infinity;
  for (const cell of cells) {
    if (cell.col < minCol) minCol = cell.col;
    if (cell.row < minRow) minRow = cell.row;
  }

  return {
    cells: cells,
    topLeft: { col: minCol, row: minRow },
  };
}

export function copySourceKeysFromSelection(selection: SelectionState): Set<string> | null {
  const cells = getSelectedCells(selection);
  if (cells.length === 0) return null;
  return new Set(cells.map((cell) => cellKey(cell.col, cell.row)));
}

export function isCopySourceCell(
  copySourceKeys: ReadonlySet<string> | null,
  col: number,
  row: number
): boolean {
  return copySourceKeys?.has(cellKey(col, row)) ?? false;
}

export function nextCopySourceKeys(
  current: ReadonlySet<string> | null,
  event: CopySourceEvent
): Set<string> | null {
  switch (event.type) {
    case 'copy':
      return copySourceKeysFromSelection(event.selection);
    case 'paste-blocked':
      return current ? new Set(current) : null;
    case 'paste-success':
    case 'escape':
      return null;
    case 'selection-change':
      if (selectionsEqual(event.from, event.to)) {
        return current instanceof Set ? current : current ? new Set(current) : null;
      }
      return null;
  }
}

export function getFlowClipboardShortcut(event: {
  key: string;
  code?: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}): FlowClipboardShortcut | null {
  if (!(event.metaKey || event.ctrlKey)) return null;
  if (event.altKey || event.shiftKey) return null;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key.toLowerCase();
  if (key === 'c' || event.code === 'KeyC') return 'copy';
  if (key === 'v' || event.code === 'KeyV') return 'paste';
  return null;
}

/**
 * True when the event target is a native field we must not steal Cmd/Ctrl+C/V from
 * (settings, sidebar, auth, comment popover, etc.).
 */
export function isForeignClipboardTarget(
  target: EventTarget | null,
  gridRoot: HTMLElement | null
): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
    return true;
  }
  if (target.isContentEditable && (!gridRoot || !gridRoot.contains(target))) {
    return true;
  }
  return false;
}

/**
 * Grid-scoped clipboard: in-grid nodes count, plus document/body because
 * flow cells are not tabbable and a click typically leaves focus on body.
 */
export function isFlowGridClipboardScope(
  target: EventTarget | null,
  gridRoot: HTMLElement | null
): boolean {
  if (!gridRoot) return false;
  if (!(target instanceof Node)) return false;
  if (gridRoot.contains(target)) return true;
  if (typeof document !== 'undefined') {
    if (target === document || target === document.body || target === document.documentElement) {
      return true;
    }
  }
  return false;
}

export function shouldHandleFlowClipboardShortcut(
  event: {
    key: string;
    code?: string;
    metaKey: boolean;
    ctrlKey: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
    target: EventTarget | null;
  },
  options: {
    gridRoot: HTMLElement | null;
    isEditing: boolean;
    hasSelection: boolean;
  }
): FlowClipboardShortcut | null {
  const shortcut = getFlowClipboardShortcut(event);
  if (!shortcut) return null;
  if (!options.hasSelection) return null;
  // While a cell is being edited, leave Cmd/Ctrl+C/V to contentEditable.
  if (options.isEditing) return null;
  if (isForeignClipboardTarget(event.target, options.gridRoot)) return null;
  if (!isFlowGridClipboardScope(event.target, options.gridRoot)) return null;
  return shortcut;
}

export function shouldFlashBlockedPaste(attempt: PasteAttempt, hasTarget: boolean): boolean {
  return attempt.status === 'blocked' && attempt.reason === 'empty-clipboard' && hasTarget;
}
