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
 * 
 * Stacks are stored in refs to prevent re-renders on every push.
 * canUndo/canRedo are exposed as state for UI reactivity if needed.
 */
export function useUndoRedo() {
  const undoStackRef = useRef<HistoryEntry[]>([]);
  const redoStackRef = useRef<HistoryEntry[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const pushEdit = useCallback((edit: CellEdit) => {
    undoStackRef.current = [...undoStackRef.current, edit];
    if (undoStackRef.current.length > MAX_STACK) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const pushBatch = useCallback((edits: CellEdit[]) => {
    if (edits.length === 0) return;
    undoStackRef.current = [...undoStackRef.current, { edits }];
    if (undoStackRef.current.length > MAX_STACK) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const undo = useCallback((): CellEdit | BatchEdit | null => {
    if (undoStackRef.current.length === 0) return null;
    const entry = undoStackRef.current[undoStackRef.current.length - 1];
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    redoStackRef.current = [...redoStackRef.current, entry];
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
    return entry;
  }, []);

  const redo = useCallback((): CellEdit | BatchEdit | null => {
    if (redoStackRef.current.length === 0) return null;
    const entry = redoStackRef.current[redoStackRef.current.length - 1];
    redoStackRef.current = redoStackRef.current.slice(0, -1);
    undoStackRef.current = [...undoStackRef.current, entry];
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
    return entry;
  }, []);

  const clear = useCallback(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  return {
    pushEdit,
    pushBatch,
    undo,
    redo,
    clear,
    canUndo,
    canRedo,
    isBatchEdit,
  };
}
