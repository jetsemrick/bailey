import { useState, useEffect, useCallback, useRef } from 'react';
import type { Flow, FlowCell, CellColor, FlowTabKind, Round } from '../db/types';
import * as api from '../db/api';
import {
  clearStoredActiveFlowId,
  readStoredActiveFlowId,
  writeStoredActiveFlowId,
} from '../lib/roundFlowTabStorage';

const DEBOUNCE_MS = 500;

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useFlowGrid(roundId: string | undefined, _round?: Round | null) {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
  const [cells, setCells] = useState<Map<string, FlowCell>>(new Map());
  /** Save counter per flow, bumped only after that flow's cells reach the DB (DEB-59). */
  const [savedFlowRevisions, setSavedFlowRevisions] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Save status for the active flow (DEB-64). */
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cellsLoadRequestRef = useRef(0);

  const markFlowSaved = useCallback((flowId: string) => {
    setSavedFlowRevisions((prev) => {
      const next = new Map(prev);
      next.set(flowId, (next.get(flowId) ?? 0) + 1);
      return next;
    });
  }, []);

  // Remember active flow tab per round (browser tab reload / restore)
  useEffect(() => {
    if (!roundId || !activeFlowId) return;
    writeStoredActiveFlowId(roundId, activeFlowId);
  }, [roundId, activeFlowId]);

  // Dirty cells awaiting save (per flow so tab switches cannot mis-attribute restores)
  type DirtyCell = { column_index: number; row_index: number; content: string; color: CellColor; comment: string };
  const dirtyByFlowRef = useRef<Map<string, Map<string, DirtyCell>>>(new Map());
  const timerByFlowRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const activeFlowIdRef = useRef<string | null>(activeFlowId);
  activeFlowIdRef.current = activeFlowId;
  /**
   * Tail of the write queue. Serializes upserts so a failed older snapshot cannot
   * restore over a newer write (DEB-58), and so awaiting a flush also awaits every
   * write queued before it (DEB-59).
   */
  const flushQueueRef = useRef<Promise<void>>(Promise.resolve());

  const clearFlowTimer = useCallback((flowId: string) => {
    const existing = timerByFlowRef.current.get(flowId);
    if (existing) {
      clearTimeout(existing);
      timerByFlowRef.current.delete(flowId);
    }
  }, []);

  const armFlowTimer = useCallback((flowId: string, run: () => void) => {
    clearFlowTimer(flowId);
    const timer = setTimeout(() => {
      timerByFlowRef.current.delete(flowId);
      run();
    }, DEBOUNCE_MS);
    timerByFlowRef.current.set(flowId, timer);
  }, [clearFlowTimer]);

  const dirtyMapFor = useCallback((flowId: string) => {
    let map = dirtyByFlowRef.current.get(flowId);
    if (!map) {
      map = new Map();
      dirtyByFlowRef.current.set(flowId, map);
    }
    return map;
  }, []);

  /** DEB-58: re-queue failed writes without clobbering newer edits for the same cell. */
  const restoreDirtyCells = useCallback((flowId: string, toSave: DirtyCell[]) => {
    const map = dirtyMapFor(flowId);
    for (const cell of toSave) {
      const key = `${cell.column_index}:${cell.row_index}`;
      if (!map.has(key)) {
        map.set(key, cell);
      }
    }
  }, [dirtyMapFor]);

  const markDirty = useCallback((flowId: string, key: string, cell: DirtyCell) => {
    dirtyMapFor(flowId).set(key, cell);
  }, [dirtyMapFor]);

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
  // DEB-59: cells are claimed synchronously and each write is queued behind the
  // last, so the returned promise settles only once every earlier write has
  // landed. Readers that await a flush (DecisionView, Ctrl+S) never race a save.
  const flushFlowCells = useCallback((flowId: string): Promise<void> => {
    const dirty = dirtyByFlowRef.current.get(flowId);
    if (!dirty || dirty.size === 0) return flushQueueRef.current;

    const toSave = Array.from(dirty.values());
    dirty.clear();

    // DEB-64: Update save status to 'saving' when starting flush
    if (flowId === activeFlowIdRef.current) {
      setSaveStatus('saving');
    }

    const queued = flushQueueRef.current.then(async () => {
      try {
        await api.upsertCells(flowId, toSave);
        setError(null);
        markFlowSaved(flowId);
        // DEB-64: Update save status to 'saved' on success, auto-hide after 2s
        if (flowId === activeFlowIdRef.current) {
          setSaveStatus('saved');
          if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
          saveStatusTimerRef.current = setTimeout(() => {
            setSaveStatus('idle');
          }, 2000);
        }
      } catch (err) {
        // DEB-58: restore into this flow's dirty map; newer edits for the same key win
        restoreDirtyCells(flowId, toSave);
        setError(err instanceof Error ? err.message : 'Failed to save cells');
        // DEB-64: Update save status to 'error' on failure
        if (flowId === activeFlowIdRef.current) {
          setSaveStatus('error');
        }
      }

      // Retry if restore (or concurrent edits) left dirty cells for this flow
      if ((dirtyByFlowRef.current.get(flowId)?.size ?? 0) > 0) {
        armFlowTimer(flowId, () => {
          void flushFlowCells(flowId);
        });
      }
    });

    flushQueueRef.current = queued;
    return queued;
  }, [restoreDirtyCells, armFlowTimer, markFlowSaved]);

  const flush = useCallback(async () => {
    const flowId = activeFlowIdRef.current;
    if (!flowId) {
      await flushQueueRef.current;
      return;
    }
    await flushFlowCells(flowId);
  }, [flushFlowCells]);

  const scheduleSave = useCallback(() => {
    const flowId = activeFlowIdRef.current;
    if (!flowId) return;
    // DEB-64: Set save status to 'saving' during debounce
    setSaveStatus('saving');
    // Only debounce this flow — do not cancel retries armed for other flows (DEB-58)
    armFlowTimer(flowId, () => {
      void flush();
    });
  }, [flush, armFlowTimer]);

  // Flush pending changes before page unload (DEB-64: use keepalive for reliability)
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Flush all dirty flows, not just the active one
      for (const [flowId, dirty] of dirtyByFlowRef.current.entries()) {
        if (dirty.size === 0) continue;
        const toSave = Array.from(dirty.values());
        dirty.clear();
        // Use keepalive fetch so browser doesn't kill the request
        api.upsertCellsWithKeepalive(flowId, toSave).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Clear debounce timers only on unmount (not on tab switch)
  useEffect(() => {
    return () => {
      for (const timer of timerByFlowRef.current.values()) clearTimeout(timer);
      timerByFlowRef.current.clear();
      if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
    };
  }, []);

  // Flush when switching flow tabs (activeFlowId changes)
  const prevFlowIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevFlowIdRef.current && prevFlowIdRef.current !== activeFlowId) {
      const prevId = prevFlowIdRef.current;
      void flushFlowCells(prevId);
    }
    prevFlowIdRef.current = activeFlowId;
  }, [activeFlowId, flushFlowCells]);

  // Manual save (Ctrl+S) / DecisionView pre-fetch (DEB-59)
  const saveNow = useCallback(async () => {
    const flowId = activeFlowIdRef.current;
    if (flowId) clearFlowTimer(flowId);
    await flush();
  }, [flush, clearFlowTimer]);

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

        markDirty(activeFlowId, key, { column_index: col, row_index: row, content, color, comment });
        return next;
      });

      scheduleSave();
    },
    [activeFlowId, scheduleSave, markDirty]
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
        markDirty(activeFlowId, key, {
          column_index: col,
          row_index: row,
          content,
          color: cellColor,
          comment: existing?.comment ?? '',
        });
        return next;
      });

      scheduleSave();
    },
    [activeFlowId, scheduleSave, markDirty]
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
          markDirty(activeFlowId, key, {
            column_index: u.col,
            row_index: u.row,
            content: u.content,
            color: u.color,
            comment: comment,
          });
        }
        return next;
      });
      scheduleSave();
    },
    [activeFlowId, scheduleSave, markDirty]
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
    saveStatus,
    getCell,
    getCellContent,
    getCellColor,
    getCellComment,
    setCellComment,
    updateCell,
    updateCellColor,
    bulkUpdateCells,
    getColumnRowCount,
    savedFlowRevisions,
    saveNow,
    addFlow,
    renameFlow,
    removeFlow,
    reorderFlows,
    selectFlow,
    reloadFlows: loadFlows,
  };
}
