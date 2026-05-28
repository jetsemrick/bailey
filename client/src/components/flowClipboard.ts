import type { CellColor } from '../db/types';
import type { CellEdit } from '../hooks/useUndoRedo';
import type { CellCoords } from './flowSelection';

export interface ClipboardCellSnapshot {
  colOffset: number;
  rowOffset: number;
  content: string;
  color: CellColor;
  comment: string;
}

export interface FlowClipboardPayload {
  minCol: number;
  minRow: number;
  cells: ClipboardCellSnapshot[];
}

export interface CellSnapshot {
  col: number;
  row: number;
  content: string;
  color: CellColor;
  comment: string;
}

export interface PastePlan {
  updates: {
    col: number;
    row: number;
    content: string;
    color: CellColor;
    comment: string;
  }[];
  edits: CellEdit[];
}

const CLIPBOARD_MIME = 'application/x-bailey-flow-cells';

/** In-memory fallback when system clipboard is unavailable. */
let memoryClipboard: FlowClipboardPayload | null = null;

export function getMemoryClipboard(): FlowClipboardPayload | null {
  return memoryClipboard;
}

export function setMemoryClipboard(payload: FlowClipboardPayload | null): void {
  memoryClipboard = payload;
}

export function buildClipboardPayload(cells: CellSnapshot[]): FlowClipboardPayload {
  if (cells.length === 0) {
    return { minCol: 0, minRow: 0, cells: [] };
  }
  const minCol = Math.min(...cells.map((c) => c.col));
  const minRow = Math.min(...cells.map((c) => c.row));
  const snapshots: ClipboardCellSnapshot[] = cells.map((c) => ({
    colOffset: c.col - minCol,
    rowOffset: c.row - minRow,
    content: c.content,
    color: c.color,
    comment: c.comment,
  }));
  return { minCol, minRow, cells: snapshots };
}

export function serializeClipboardPayload(payload: FlowClipboardPayload): string {
  return JSON.stringify({ version: 1, ...payload });
}

export function parseClipboardPayload(text: string): FlowClipboardPayload | null {
  try {
    const parsed = JSON.parse(text) as FlowClipboardPayload & { version?: number };
    if (!parsed?.cells || !Array.isArray(parsed.cells)) return null;
    return {
      minCol: parsed.minCol ?? 0,
      minRow: parsed.minRow ?? 0,
      cells: parsed.cells,
    };
  } catch {
    return null;
  }
}

export function clipboardPlainText(payload: FlowClipboardPayload): string {
  const byRow = new Map<number, Map<number, string>>();
  for (const cell of payload.cells) {
    const row = payload.minRow + cell.rowOffset;
    const col = payload.minCol + cell.colOffset;
    if (!byRow.has(row)) byRow.set(row, new Map());
    let text = cell.content.replace(/<[^>]+>/g, '');
    if (typeof document !== 'undefined') {
      const div = document.createElement('div');
      div.innerHTML = cell.content;
      text = div.textContent ?? text;
    }
    byRow.get(row)!.set(col, text);
  }
  const rows = [...byRow.keys()].sort((a, b) => a - b);
  const cols = new Set<number>();
  for (const cell of payload.cells) {
    cols.add(payload.minCol + cell.colOffset);
  }
  const sortedCols = [...cols].sort((a, b) => a - b);
  return rows
    .map((row) =>
      sortedCols.map((col) => byRow.get(row)?.get(col) ?? '').join('\t')
    )
    .join('\n');
}

export function buildPastePlan(
  payload: FlowClipboardPayload,
  anchor: CellCoords,
  dataCols: number[],
  readCell: (col: number, row: number) => CellSnapshot
): PastePlan {
  const updates: PastePlan['updates'] = [];
  const edits: CellEdit[] = [];
  const colSet = new Set(dataCols);

  for (const snap of payload.cells) {
    const col = anchor.col + snap.colOffset;
    const row = anchor.row + snap.rowOffset;
    if (!colSet.has(col) || row < 0) continue;

    const prev = readCell(col, row);
    if (
      prev.content === snap.content &&
      prev.color === snap.color &&
      prev.comment === snap.comment
    ) {
      continue;
    }

    edits.push({
      col,
      row,
      previousContent: prev.content,
      newContent: snap.content,
      previousColor: prev.color,
      newColor: snap.color,
      previousComment: prev.comment,
      newComment: snap.comment,
    });
    updates.push({
      col,
      row,
      content: snap.content,
      color: snap.color,
      comment: snap.comment,
    });
  }

  return { updates, edits };
}

export function buildClearEdits(
  cells: CellCoords[],
  readCell: (col: number, row: number) => CellSnapshot
): { updates: PastePlan['updates']; edits: CellEdit[] } {
  const updates: PastePlan['updates'] = [];
  const edits: CellEdit[] = [];

  for (const { col, row } of cells) {
    const prev = readCell(col, row);
    const hasAny =
      prev.content.trim() !== '' || prev.color !== null || prev.comment.trim() !== '';
    if (!hasAny) continue;
    edits.push({
      col,
      row,
      previousContent: prev.content,
      newContent: '',
      previousColor: prev.color,
      newColor: null,
      previousComment: prev.comment,
      newComment: '',
    });
    updates.push({
      col,
      row,
      content: '',
      color: null,
      comment: '',
    });
  }

  return { updates, edits };
}

export { CLIPBOARD_MIME };

export async function writeClipboard(payload: FlowClipboardPayload): Promise<void> {
  setMemoryClipboard(payload);
  const text = serializeClipboardPayload(payload);
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // keep memory fallback
    }
  }
}

export async function readClipboard(): Promise<FlowClipboardPayload | null> {
  const memory = getMemoryClipboard();
  if (memory) return memory;

  if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = parseClipboardPayload(text);
      if (parsed) {
        setMemoryClipboard(parsed);
        return parsed;
      }
    } catch {
      // ignore
    }
  }
  return null;
}
