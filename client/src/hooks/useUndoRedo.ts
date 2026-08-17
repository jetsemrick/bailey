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

export interface BatchEdit {
  edits: CellEdit[];
}

export type HistoryEntry = CellEdit | BatchEdit;

function isBatchEdit(entry: HistoryEntry): entry is BatchEdit {
  return 'edits' in entry;
}

const MAX_STACK = 100;

/**
 * Undo/redo stack for cell-level edits.
 * Integrates with useFlowGrid by returning handlers that should wrap cell updates.
 * Supports batch edits that undo/redo as a single operation.
 */
export function useUndoRedo() {
  const [undoStack, setUndoStack] = useState<HistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryEntry[]>([]);
  const stackRef = useRef({ undo: undoStack, redo: redoStack });
  stackRef.current = { undo: undoStack, redo: redoStack };

  const pushEdit = useCallback((edit: CellEdit) => {
    setUndoStack((prev) => {
      const next = [...prev, edit];
      if (next.length > MAX_STACK) next.shift();
      return next;
    });
    setRedoStack([]);
  }, []);

  const pushBatch = useCallback((edits: CellEdit[]) => {
    if (edits.length === 0) return;
    setUndoStack((prev) => {
      const next = [...prev, { edits }];
      if (next.length > MAX_STACK) next.shift();
      return next;
    });
    setRedoStack([]);
  }, []);

  const undo = useCallback((): CellEdit | BatchEdit | null => {
    const stack = stackRef.current.undo;
    if (stack.length === 0) return null;
    const entry = stack[stack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, entry]);
    return entry;
  }, []);

  const redo = useCallback((): CellEdit | BatchEdit | null => {
    const stack = stackRef.current.redo;
    if (stack.length === 0) return null;
    const entry = stack[stack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, entry]);
    return entry;
  }, []);

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
    isBatchEdit,
  };
}
