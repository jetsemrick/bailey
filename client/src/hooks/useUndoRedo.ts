import { useState, useCallback, useRef } from 'react';

interface CellEdit {
  col: number;
  row: number;
  previousContent: string;
  newContent: string;
  previousColor: string | null;
  newColor: string | null;
}

const MAX_STACK = 100;

/**
 * Undo/redo stack for cell-level edits.
 * Integrates with useFlowGrid by returning handlers that should wrap cell updates.
 */
export function useUndoRedo() {
  const [undoStack, setUndoStack] = useState<CellEdit[]>([]);
  const [redoStack, setRedoStack] = useState<CellEdit[]>([]);
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

  const undo = useCallback((): CellEdit | null => {
    const stack = stackRef.current.undo;
    if (stack.length === 0) return null;
    const edit = stack[stack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, edit]);
    return edit;
  }, []);

  const redo = useCallback((): CellEdit | null => {
    const stack = stackRef.current.redo;
    if (stack.length === 0) return null;
    const edit = stack[stack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, edit]);
    return edit;
  }, []);

  const clear = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  return {
    pushEdit,
    undo,
    redo,
    clear,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  };
}
