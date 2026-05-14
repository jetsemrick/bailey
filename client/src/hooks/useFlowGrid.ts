import { useState, useEffect, useCallback, useRef } from 'react';
import type { Flow, FlowCell, CellColor, FlowTabKind, Round } from '../db/types';
import * as api from '../db/api';
import {
  clearStoredActiveFlowId,
  readStoredActiveFlowId,
  writeStoredActiveFlowId,
} from '../lib/roundFlowTabStorage';
import { LEGACY_1NR_DATA_COL, NEGATIVE_BLOCK_DATA_COL } from '../lib/flowColumns';

const DEBOUNCE_MS = 500;

type CellUpdate = {
  column_index: number;
  row_index: number;
  content: string;
  color: CellColor;
  comment: string;
};

function hasCellData(cell: Pick<FlowCell, 'content' | 'color' | 'comment'>): boolean {
  return cell.content.trim() !== '' || cell.color !== null || cell.comment.trim() !== '';
}

export function normalizeNegativeBlockCells(data: FlowCell[]): {
  cells: Map<string, FlowCell>;
  migrationUpdates: CellUpdate[];
} {
  const cells = new Map<string, FlowCell>();
  const legacyOneNrCells = data
    .filter((cell) => cell.column_index === LEGACY_1NR_DATA_COL && hasCellData(cell))
    .sort((a, b) => a.row_index - b.row_index);

  let blockMaxRow = -1;
  for (const cell of data) {
    if (cell.column_index === LEGACY_1NR_DATA_COL) continue;
    cells.set(`${cell.column_index}:${cell.row_index}`, cell);
    if (cell.column_index === NEGATIVE_BLOCK_DATA_COL && hasCellData(cell)) {
      blockMaxRow = Math.max(blockMaxRow, cell.row_index);
    }
  }

  if (legacyOneNrCells.length === 0) {
    return { cells, migrationUpdates: [] };
  }

  const migrationUpdates: CellUpdate[] = [];
  let nextBlockRow = blockMaxRow + 1;
  for (const legacyCell of legacyOneNrCells) {
    const key = `${NEGATIVE_BLOCK_DATA_COL}:${nextBlockRow}`;
    const existingTarget = cells.get(key);
    const migratedCell: FlowCell = {
      ...legacyCell,
      id: existingTarget?.id ?? legacyCell.id,
      column_index: NEGATIVE_BLOCK_DATA_COL,
      row_index: nextBlockRow,
    };
    cells.set(key, migratedCell);
    migrationUpdates.push({
      column_index: NEGATIVE_BLOCK_DATA_COL,
      row_index: nextBlockRow,
      content: legacyCell.content,
      color: legacyCell.color,
      comment: legacyCell.comment,
    });
    migrationUpdates.push({
      column_index: LEGACY_1NR_DATA_COL,
      row_index: legacyCell.row_index,
      content: '',
      color: null,
      comment: '',
    });
    nextBlockRow += 1;
  }

  return { cells, migrationUpdates };
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

  const bumpCellsRevision = useCallback(() => {
    setCellsRevision((r) => r + 1);
  }, []);

  // Remember active flow tab per round (browser tab reload / restore)
  useEffect(() => {
    if (!roundId || !activeFlowId) return;
    writeStoredActiveFlowId(roundId, activeFlowId);
  }, [roundId, activeFlowId]);

  // Dirty cells awaiting save
  const dirtyRef = useRef<Map<string, CellUpdate>>(new Map());
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

  const activeFlowTabKind = flows.find((flow) => flow.id === activeFlowId)?.tab_kind;

  // -- Load cells when active flow changes --
  const loadCells = useCallback(async (flowId: string, normalizeNegativeBlock = true) => {
    const requestId = ++cellsLoadRequestRef.current;
    try {
      const data = await api.listCells(flowId);
      if (requestId !== cellsLoadRequestRef.current) return;
      const { cells: map, migrationUpdates } = normalizeNegativeBlock
        ? normalizeNegativeBlockCells(data)
        : {
            cells: new Map(data.map((c) => [`${c.column_index}:${c.row_index}`, c])),
            migrationUpdates: [],
          };
      setCells(map);
      if (migrationUpdates.length > 0) {
        api.upsertCells(flowId, migrationUpdates).catch((err) => {
          setError(err instanceof Error ? err.message : 'Failed to save Negative block cells');
        });
      }
    } catch (err) {
      if (requestId !== cellsLoadRequestRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load cells');
    }
  }, []);

  useEffect(() => {
    if (activeFlowId) {
      // DEB-26: clear immediately so we never show the previous tab's cells while loading
      setCells(new Map());
      loadCells(activeFlowId, activeFlowTabKind !== 'cx');
    } else {
      cellsLoadRequestRef.current++;
      setCells(new Map());
    }
  }, [activeFlowId, activeFlowTabKind, loadCells]);

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
        // Best-effort flush on unload (may not complete for async)
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

        dirtyRef.current.set(key, { column_index: col, row_index: row, content, color, comment });
        return next;
      });

      scheduleSave();
      bumpCellsRevision();
    },
    [activeFlowId, scheduleSave, bumpCellsRevision]
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
        dirtyRef.current.set(key, { column_index: col, row_index: row, content, color: cellColor, comment: existing?.comment ?? '' });
        return next;
      });

      scheduleSave();
      bumpCellsRevision();
    },
    [activeFlowId, scheduleSave, bumpCellsRevision]
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
          dirtyRef.current.set(key, {
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
      bumpCellsRevision();
    },
    [activeFlowId, scheduleSave, bumpCellsRevision]
  );

  // -- Row count per column (dynamic, only counts non-empty cells) --
  const getColumnRowCount = useCallback(
    (col: number): number => {
      let max = -1;
      for (const [key, cell] of cells) {
        const [c, r] = key.split(':').map(Number);
        if (c === col && hasCellData(cell) && r > max) max = r;
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
