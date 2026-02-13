import { useState, useEffect, useCallback, useRef } from 'react';
import type { Flow, FlowCell, CellColor } from '../db/types';
import * as api from '../db/api';

const DEBOUNCE_MS = 500;

export function useFlowGrid(roundId: string | undefined) {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
  const [cells, setCells] = useState<Map<string, FlowCell>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dirty cells awaiting save
  const dirtyRef = useRef<Map<string, { column_index: number; row_index: number; content: string; color: CellColor }>>(new Map());
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
        setActiveFlowId((prev) => {
          // Keep current selection if still valid
          if (prev && data.some((f) => f.id === prev)) return prev;
          return data[0].id;
        });
      } else {
        setActiveFlowId(null);
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
    try {
      const data = await api.listCells(flowId);
      const map = new Map<string, FlowCell>();
      data.forEach((c) => map.set(`${c.column_index}:${c.row_index}`, c));
      setCells(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cells');
    }
  }, []);

  useEffect(() => {
    if (activeFlowId) {
      loadCells(activeFlowId);
    } else {
      setCells(new Map());
    }
  }, [activeFlowId, loadCells]);

  // -- Flush dirty cells to Supabase --
  const flush = useCallback(async () => {
    if (!activeFlowId || dirtyRef.current.size === 0) return;
    const toSave = Array.from(dirtyRef.current.values());
    dirtyRef.current.clear();
    try {
      await api.upsertCells(activeFlowId, toSave);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save cells');
    }
  }, [activeFlowId]);

  const scheduleSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, DEBOUNCE_MS);
  }, [flush]);

  // Flush pending changes before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (dirtyRef.current.size > 0 && activeFlowId) {
        const toSave = Array.from(dirtyRef.current.values());
        dirtyRef.current.clear();
        // Use sendBeacon for reliable delivery during unload
        const payload = JSON.stringify({ flowId: activeFlowId, cells: toSave });
        navigator.sendBeacon?.('/api/flush', payload);
        // Also try synchronous flush (may not complete)
        api.upsertCells(activeFlowId, toSave).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeFlowId]);

  // Flush when switching flow tabs (activeFlowId changes)
  const prevFlowIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevFlowIdRef.current && prevFlowIdRef.current !== activeFlowId) {
      // Flush dirty cells from the previous flow
      if (dirtyRef.current.size > 0) {
        const prevId = prevFlowIdRef.current;
        const toSave = Array.from(dirtyRef.current.values());
        dirtyRef.current.clear();
        api.upsertCells(prevId, toSave).catch((err) => {
          setError(err instanceof Error ? err.message : 'Failed to save cells');
        });
      }
    }
    prevFlowIdRef.current = activeFlowId;
  }, [activeFlowId]);

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
          created_at: existing?.created_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        // Track dirty cell for auto-save
        dirtyRef.current.set(key, { column_index: col, row_index: row, content, color: cellColor });
        return next;
      });

      scheduleSave();
    },
    [activeFlowId, scheduleSave]
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
    (updates: { col: number; row: number; content: string; color: CellColor }[]) => {
      if (!activeFlowId) return;
      setCells((prev) => {
        const next = new Map(prev);
        for (const u of updates) {
          const key = `${u.col}:${u.row}`;
          const existing = next.get(key);
          next.set(key, {
            id: existing?.id ?? '',
            user_id: existing?.user_id ?? '',
            flow_id: activeFlowId,
            column_index: u.col,
            row_index: u.row,
            content: u.content,
            color: u.color,
            created_at: existing?.created_at ?? new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          dirtyRef.current.set(key, {
            column_index: u.col,
            row_index: u.row,
            content: u.content,
            color: u.color,
          });
        }
        return next;
      });
      scheduleSave();
    },
    [activeFlowId, scheduleSave]
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
    async (positionName: string, initiatedBy: 'aff' | 'neg') => {
      if (!roundId) return;
      const order = flows.length;
      const flow = await api.createFlow(roundId, {
        position_name: positionName,
        initiated_by: initiatedBy,
        display_order: order,
      });
      setFlows((prev) => [...prev, flow]);
      setActiveFlowId(flow.id);
      setCells(new Map());
    },
    [roundId, flows.length]
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
        }
        return next;
      });
    },
    [activeFlowId]
  );

  const reorderFlows = useCallback(
    async (reordered: Flow[]) => {
      setFlows(reordered);
      const updates = reordered.map((f, i) => ({ id: f.id, display_order: i }));
      await api.reorderFlows(updates);
    },
    []
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
    updateCell,
    updateCellColor,
    bulkUpdateCells,
    getColumnRowCount,
    saveNow,
    addFlow,
    renameFlow,
    removeFlow,
    reorderFlows,
    selectFlow,
    reloadFlows: loadFlows,
  };
}
