import { useState, useCallback, useRef } from 'react';

export interface CellEdit {
  col: number;
  row: number;
  previousContent: string;
  newContent: string;
  previousColor: string | null;
  newColor: string | null;
  previousComment: string;
  newComment: string;
}

export type UndoEntry = CellEdit | CellEdit[];

function isBatch(entry: UndoEntry): entry is CellEdit[] {
  return Array.isArray(entry);
}

const MAX_STACK = 100;

/**
 * Undo/redo stack for cell-level edits (single or batched).
 */
export function useUndoRedo() {
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [redoStack, setRedoStack] = useState<UndoEntry[]>([]);
  const stackRef = useRef({ undo: undoStack, redo: redoStack });
  stackRef.current = { undo: undoStack, redo: redoStack };

  const pushEntry = useCallback((entry: UndoEntry) => {
    setUndoStack((prev) => {
      const next = [...prev, entry];
      if (next.length > MAX_STACK) next.shift();
      return next;
    });
    setRedoStack([]);
  }, []);

  const pushEdit = useCallback(
    (edit: CellEdit) => {
      pushEntry(edit);
    },
    [pushEntry]
  );

  const pushBatch = useCallback(
    (edits: CellEdit[]) => {
      if (edits.length === 0) return;
      if (edits.length === 1) {
        pushEntry(edits[0]);
        return;
      }
      pushEntry(edits);
    },
    [pushEntry]
  );

  const popUndoEntry = useCallback((): UndoEntry | null => {
    const stack = stackRef.current.undo;
    if (stack.length === 0) return null;
    const entry = stack[stack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, entry]);
    return entry;
  }, []);

  const popRedoEntry = useCallback((): UndoEntry | null => {
    const stack = stackRef.current.redo;
    if (stack.length === 0) return null;
    const entry = stack[stack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, entry]);
    return entry;
  }, []);

  /** Apply undo: returns edits whose *previous* state should be restored. */
  const undo = useCallback((): CellEdit[] | null => {
    const entry = popUndoEntry();
    if (!entry) return null;
    return isBatch(entry) ? [...entry].reverse() : [entry];
  }, [popUndoEntry]);

  /** Apply redo: returns edits whose *new* state should be applied. */
  const redo = useCallback((): CellEdit[] | null => {
    const entry = popRedoEntry();
    if (!entry) return null;
    return isBatch(entry) ? entry : [entry];
  }, [popRedoEntry]);

  const clear = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  return {
    pushEdit,
    pushBatch,
    undo,
    redo,
    clear,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  };
}
