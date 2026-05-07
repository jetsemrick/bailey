import { useState, useEffect, useCallback, useRef } from 'react';
import type { Flow, FlowCell, CellColor, FlowTabKind, Round } from '../db/types';
import * as api from '../db/api';
import {
  clearStoredActiveFlowId,
  readStoredActiveFlowId,
  writeStoredActiveFlowId,
} from '../lib/roundFlowTabStorage';

const DEBOUNCE_MS = 500;

type DirtyCell = {
  flow_id: string;
  column_index: number;
  row_index: number;
  content: string;
  color: CellColor;
  comment: string;
};

function dirtyCellKey(flowId: string, col: number, row: number) {
  return `${flowId}:${col}:${row}`;
}

function sameDirtyCell(a: DirtyCell, b: DirtyCell) {
  return (
    a.flow_id === b.flow_id &&
    a.column_index === b.column_index &&
    a.row_index === b.row_index &&
    a.content === b.content &&
    a.color === b.color &&
    a.comment === b.comment
  );
}

export function useFlowGrid(roundId: string | undefined, _round?: Round | null) {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
  const [cells, setCells] = useState<Map<string, FlowCell>>(new Map());
  /** Increments when any flow cells change (DEB-27: DecisionView refetch). */
  const [cellsRevision, setCellsRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cellsLoadRequestRef = useRef(0);
  const reorderRequestRef = useRef(0);

  const bumpCellsRevision = useCallback(() => {
    setCellsRevision((r) => r + 1);
  }, []);

  // Remember active flow tab per round (browser tab reload / restore)
  useEffect(() => {
    if (!roundId || !activeFlowId) return;
    writeStoredActiveFlowId(roundId, activeFlowId);
  }, [roundId, activeFlowId]);

  // Dirty cells awaiting save
  const dirtyRef = useRef<Map<string, DirtyCell>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // -- Load flows for the round --
  const loadFlows = useCallback(async () => {
    if (!roundId) {
      setFlows([]);
      setActiveFlowId(null);
      setCells(new Map());
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await api.listFlows(roundId);
      setFlows(data);
      if (data.length > 0) {
        const stored = readStoredActiveFlowId(roundId);
        setActiveFlowId((prev) => {
          if (stored && data.some((f) => f.id === stored)) return stored;
          if (prev && data.some((f) => f.id === prev)) return prev;
          return data[0].id;
        });
      } else {
        setActiveFlowId(null);
        clearStoredActiveFlowId(roundId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load flows');
    } finally {
      setLoading(false);
    }
  }, [roundId]);

  useEffect(() => {
    loadFlows();
  }, [loadFlows]);

  // -- Load cells when active flow changes --
  const loadCells = useCallback(async (flowId: string) => {
    const requestId = ++cellsLoadRequestRef.current;
    try {
      const data = await api.listCells(flowId);
      if (requestId !== cellsLoadRequestRef.current) return;
      const map = new Map<string, FlowCell>();
      data.forEach((c) => map.set(`${c.column_index}:${c.row_index}`, c));
      for (const cell of dirtyRef.current.values()) {
        if (cell.flow_id !== flowId) continue;
        const key = `${cell.column_index}:${cell.row_index}`;
        const existing = map.get(key);
        map.set(key, {
          id: existing?.id ?? '',
          user_id: existing?.user_id ?? '',
          flow_id: flowId,
          column_index: cell.column_index,
          row_index: cell.row_index,
          content: cell.content,
          color: cell.color,
          comment: cell.comment,
          created_at: existing?.created_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      setCells(map);
    } catch (err) {
      if (requestId !== cellsLoadRequestRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load cells');
    }
  }, []);

  useEffect(() => {
    if (activeFlowId) {
      // DEB-26: clear immediately so we never show the previous tab's cells while loading
      setCells(new Map());
      loadCells(activeFlowId);
    } else {
      cellsLoadRequestRef.current++;
      setCells(new Map());
    }
  }, [activeFlowId, loadCells]);

  // -- Flush dirty cells to Supabase --
  const flushFlow = useCallback(async (flowId: string) => {
    const entries = Array.from(dirtyRef.current.entries()).filter(
      ([, cell]) => cell.flow_id === flowId
    );
    if (entries.length === 0) return;
    const toSave = entries.map(([, cell]) => ({
      column_index: cell.column_index,
      row_index: cell.row_index,
      content: cell.content,
      color: cell.color,
      comment: cell.comment,
    }));
    try {
      await api.upsertCells(flowId, toSave);
      for (const [key, cell] of entries) {
        const current = dirtyRef.current.get(key);
        if (current && sameDirtyCell(current, cell)) {
          dirtyRef.current.delete(key);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save cells');
    }
  }, []);

  const flush = useCallback(async () => {
    if (!activeFlowId || dirtyRef.current.size === 0) return;
    await flushFlow(activeFlowId);
  }, [activeFlowId, flushFlow]);

  const queueDirtyCell = useCallback((flowId: string, col: number, row: number, content: string, color: CellColor, comment: string) => {
    dirtyRef.current.set(dirtyCellKey(flowId, col, row), {
      flow_id: flowId,
      column_index: col,
      row_index: row,
      content,
      color,
      comment,
    });
  }, []);

  const scheduleSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, DEBOUNCE_MS);
  }, [flush]);

  // Flush pending changes before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (dirtyRef.current.size > 0 && activeFlowId) {
        // Best-effort flush on unload (may not complete for async)
        void flushFlow(activeFlowId);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeFlowId, flushFlow]);

  // Flush when switching flow tabs (activeFlowId changes)
  const prevFlowIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevFlowIdRef.current && prevFlowIdRef.current !== activeFlowId) {
      // Flush dirty cells from the previous flow
      if (dirtyRef.current.size > 0) {
        const prevId = prevFlowIdRef.current;
        void flushFlow(prevId);
      }
    }
    prevFlowIdRef.current = activeFlowId;
  }, [activeFlowId, flushFlow]);

  // Manual save (Ctrl+S)
  const saveNow = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    await flush();
  }, [flush]);

  // -- Cell accessors --
  const getCell = useCallback(
    (col: number, row: number): FlowCell | undefined => cells.get(`${col}:${row}`),
    [cells]
  );

  const getCellContent = useCallback(
    (col: number, row: number): string => cells.get(`${col}:${row}`)?.content ?? '',
    [cells]
  );

  const getCellColor = useCallback(
    (col: number, row: number): CellColor => cells.get(`${col}:${row}`)?.color ?? null,
    [cells]
  );

  const getCellComment = useCallback(
    (col: number, row: number): string => cells.get(`${col}:${row}`)?.comment ?? '',
    [cells]
  );

  const setCellComment = useCallback(
    (col: number, row: number, comment: string) => {
      if (!activeFlowId) return;
      const key = `${col}:${row}`;

      setCells((prev) => {
        const existing = prev.get(key);
        const content = existing?.content ?? '';
        const color = existing?.color ?? null;
        
        const next = new Map(prev);
        next.set(key, {
          id: existing?.id ?? '',
          user_id: existing?.user_id ?? '',
          flow_id: activeFlowId,
          column_index: col,
          row_index: row,
          content,
          color,
          comment,
          created_at: existing?.created_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        queueDirtyCell(activeFlowId, col, row, content, color, comment);
        return next;
      });

      scheduleSave();
      bumpCellsRevision();
    },
    [activeFlowId, scheduleSave, bumpCellsRevision, queueDirtyCell]
  );

  const updateCell = useCallback(
    (col: number, row: number, content: string, color?: CellColor) => {
      if (!activeFlowId) return;
      const key = `${col}:${row}`;

      setCells((prev) => {
        const existing = prev.get(key);
        const cellColor = color !== undefined ? color : existing?.color ?? null;
        const next = new Map(prev);
        next.set(key, {
          id: existing?.id ?? '',
          user_id: existing?.user_id ?? '',
          flow_id: activeFlowId,
          column_index: col,
          row_index: row,
          content,
          color: cellColor,
          comment: existing?.comment ?? '',
          created_at: existing?.created_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        // Track dirty cell for auto-save
        queueDirtyCell(activeFlowId, col, row, content, cellColor, existing?.comment ?? '');
        return next;
      });

      scheduleSave();
      bumpCellsRevision();
    },
    [activeFlowId, scheduleSave, bumpCellsRevision, queueDirtyCell]
  );

  const updateCellColor = useCallback(
    (col: number, row: number, color: CellColor) => {
      const content = getCellContent(col, row);
      updateCell(col, row, content, color);
    },
    [getCellContent, updateCell]
  );

  // -- Bulk cell operations (for drag-and-drop reindex) --
  const bulkUpdateCells = useCallback(
    (updates: { col: number; row: number; content: string; color: CellColor; comment?: string }[]) => {
      if (!activeFlowId) return;
      setCells((prev) => {
        const next = new Map(prev);
        for (const u of updates) {
          const key = `${u.col}:${u.row}`;
          const existing = next.get(key);
          const comment = u.comment !== undefined ? u.comment : (existing?.comment ?? '');
          next.set(key, {
            id: existing?.id ?? '',
            user_id: existing?.user_id ?? '',
            flow_id: activeFlowId,
            column_index: u.col,
            row_index: u.row,
            content: u.content,
            color: u.color,
            comment: comment,
            created_at: existing?.created_at ?? new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          queueDirtyCell(activeFlowId, u.col, u.row, u.content, u.color, comment);
        }
        return next;
      });
      scheduleSave();
      bumpCellsRevision();
    },
    [activeFlowId, scheduleSave, bumpCellsRevision, queueDirtyCell]
  );

  // -- Row count per column (dynamic, only counts non-empty cells) --
  const getColumnRowCount = useCallback(
    (col: number): number => {
      let max = -1;
      for (const [key, cell] of cells) {
        const [c, r] = key.split(':').map(Number);
        if (c === col && cell.content.trim() !== '' && r > max) max = r;
      }
      return max + 1;
    },
    [cells]
  );

  // -- Flow tab CRUD --
  const addFlow = useCallback(
    async (initiatedBy: 'aff' | 'neg', count: number = 1, tabKind: FlowTabKind = 'standard'): Promise<boolean> => {
      if (!roundId || count < 1) return false;
      setError(null);
      if (tabKind === 'cx') {
        if (flows.some((f) => f.tab_kind === 'cx')) {
          setError('Only one cross-examination (CX) tab is allowed per round.');
          return false;
        }
        try {
          const flow = await api.createFlow(roundId, {
            position_name: 'CX',
            initiated_by: 'aff',
            display_order: flows.length,
            tab_kind: 'cx',
          });
          setFlows((prev) => [...prev, flow]);
          setActiveFlowId(flow.id);
          setCells(new Map());
          return true;
        } catch (err) {
          setError(api.toError(err, 'Failed to create CX tab').message);
          return false;
        }
      }
      const baseOrder = flows.length;
      const existingBySide = flows.filter((f) => f.initiated_by === initiatedBy).length;
      const prefix = initiatedBy === 'aff' ? 'AFF' : 'NEG';
      const created: Awaited<ReturnType<typeof api.createFlow>>[] = [];
      try {
        for (let i = 0; i < count; i++) {
          const positionName = `${prefix} ${existingBySide + i + 1}`;
          const flow = await api.createFlow(roundId, {
            position_name: positionName,
            initiated_by: initiatedBy,
            display_order: baseOrder + i,
            tab_kind: 'standard',
          });
          created.push(flow);
        }
        setFlows((prev) => [...prev, ...created]);
        setActiveFlowId(created[created.length - 1].id);
        setCells(new Map());
        return true;
      } catch (err) {
        setError(api.toError(err, 'Failed to create tab').message);
        return false;
      }
    },
    [roundId, flows]
  );

  const renameFlow = useCallback(async (id: string, name: string) => {
    const updated = await api.updateFlow(id, { position_name: name });
    setFlows((prev) => prev.map((f) => (f.id === id ? updated : f)));
  }, []);

  const removeFlow = useCallback(
    async (id: string) => {
      await api.deleteFlow(id);
      setFlows((prev) => {
        const next = prev.filter((f) => f.id !== id);
        if (activeFlowId === id) {
          setActiveFlowId(next.length > 0 ? next[0].id : null);
          setCells(new Map());
          if (roundId && next.length === 0) {
            clearStoredActiveFlowId(roundId);
          }
        }
        return next;
      });
    },
    [activeFlowId, roundId]
  );

  const reorderFlows = useCallback(
    async (reordered: Flow[]) => {
      const requestId = ++reorderRequestRef.current;
      const previous = flows;
      setFlows(reordered);
      const updates = reordered.map((f, i) => ({ id: f.id, display_order: i }));
      try {
        await api.reorderFlows(updates);
      } catch (err) {
        if (requestId === reorderRequestRef.current) {
          setFlows(previous);
          setError(err instanceof Error ? err.message : 'Failed to reorder tabs');
        }
      }
    },
    [flows]
  );

  const selectFlow = useCallback((id: string) => {
    setActiveFlowId(id);
  }, []);

  return {
    flows,
    activeFlowId,
    activeFlow: flows.find((f) => f.id === activeFlowId) ?? null,
    cells,
    loading,
    error,
    getCell,
    getCellContent,
    getCellColor,
    getCellComment,
    setCellComment,
    updateCell,
    updateCellColor,
    bulkUpdateCells,
    getColumnRowCount,
    cellsRevision,
    saveNow,
    addFlow,
    renameFlow,
    removeFlow,
    reorderFlows,
    selectFlow,
    reloadFlows: loadFlows,
  };
}
