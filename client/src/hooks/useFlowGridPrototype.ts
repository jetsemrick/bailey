import { useState, useCallback } from 'react';
import type { Flow, FlowCell, CellColor, FlowTabKind } from '../db/types';

const NOW = '2026-01-01T00:00:00.000Z';

const INITIAL_FLOWS: Flow[] = [
  {
    id: 'proto-aff-1',
    user_id: 'prototype',
    round_id: 'prototype-round',
    position_name: 'AFF 1',
    initiated_by: 'aff',
    tab_kind: 'standard',
    display_order: 0,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: 'proto-neg-1',
    user_id: 'prototype',
    round_id: 'prototype-round',
    position_name: 'NEG 1',
    initiated_by: 'neg',
    tab_kind: 'standard',
    display_order: 1,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: 'proto-neg-2',
    user_id: 'prototype',
    round_id: 'prototype-round',
    position_name: 'NEG 2',
    initiated_by: 'neg',
    tab_kind: 'standard',
    display_order: 2,
    created_at: NOW,
    updated_at: NOW,
  },
];

function makeCell(
  flowId: string,
  col: number,
  row: number,
  content: string,
  color: CellColor = null
): FlowCell {
  return {
    id: `cell-${flowId}-${col}-${row}`,
    user_id: 'prototype',
    flow_id: flowId,
    column_index: col,
    row_index: row,
    content,
    color,
    comment: '',
    created_at: NOW,
    updated_at: NOW,
  };
}

/** Sample policy-debate arguments for the AFF 1 prototype tab. */
const AFF1_CELLS: FlowCell[] = [
  makeCell('proto-aff-1', 0, 0, 'Economic engagement with China solves tech competition'),
  makeCell('proto-aff-1', 0, 1, '— US-China tech decoupling risks escalation'),
  makeCell('proto-aff-1', 0, 2, '— Engagement builds leverage on human rights'),
  makeCell('proto-aff-1', 1, 0, 'No link — decoupling already happening'),
  makeCell('proto-aff-1', 1, 1, 'Engagement failed on IP theft'),
  makeCell('proto-aff-1', 2, 0, 'Decoupling is reversible w/ targeted diplomacy'),
  makeCell('proto-aff-1', 2, 1, 'IP framework improving — USTR 2025 report'),
  makeCell('proto-aff-1', 3, 0, 'Turn — decoupling collapses supply chains'),
  makeCell('proto-aff-1', 3, 1, 'Alt causes — domestic politics'),
  makeCell('proto-aff-1', 4, 0, 'Extend engagement — only path to stability'),
  makeCell('proto-aff-1', 5, 0, 'Decoupling inevitable — vote neg on risk'),
  makeCell('proto-aff-1', 6, 0, 'Engagement outweighs — war risk on the line'),
];

function cellsToMap(cells: FlowCell[]): Map<string, FlowCell> {
  const map = new Map<string, FlowCell>();
  for (const cell of cells) {
    map.set(`${cell.column_index}:${cell.row_index}`, cell);
  }
  return map;
}

const INITIAL_CELLS: Record<string, Map<string, FlowCell>> = {
  'proto-aff-1': cellsToMap(AFF1_CELLS),
  'proto-neg-1': new Map(),
  'proto-neg-2': new Map(),
};

/**
 * In-memory flow grid for the /prototype route. Mirrors useFlowGrid's return shape
 * without Supabase so the sharp-edge flow sheet can be explored offline.
 */
export function useFlowGridPrototype() {
  const [flows, setFlows] = useState<Flow[]>(INITIAL_FLOWS);
  const [activeFlowId, setActiveFlowId] = useState<string | null>('proto-aff-1');
  const [cellsByFlow, setCellsByFlow] = useState(INITIAL_CELLS);
  const [cellsRevision, setCellsRevision] = useState(0);

  const cells = activeFlowId ? (cellsByFlow[activeFlowId] ?? new Map()) : new Map<string, FlowCell>();

  const bumpCellsRevision = useCallback(() => {
    setCellsRevision((r) => r + 1);
  }, []);

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

  const updateCells = useCallback(
    (updater: (prev: Map<string, FlowCell>) => Map<string, FlowCell>) => {
      if (!activeFlowId) return;
      setCellsByFlow((prev) => ({
        ...prev,
        [activeFlowId]: updater(prev[activeFlowId] ?? new Map()),
      }));
      bumpCellsRevision();
    },
    [activeFlowId, bumpCellsRevision]
  );

  const updateCell = useCallback(
    (col: number, row: number, content: string, color?: CellColor) => {
      if (!activeFlowId) return;
      const key = `${col}:${row}`;
      updateCells((prev) => {
        const existing = prev.get(key);
        const cellColor = color !== undefined ? color : (existing?.color ?? null);
        const next = new Map(prev);
        next.set(key, makeCell(activeFlowId, col, row, content, cellColor));
        return next;
      });
    },
    [activeFlowId, updateCells]
  );

  const updateCellColor = useCallback(
    (col: number, row: number, color: CellColor) => {
      updateCell(col, row, getCellContent(col, row), color);
    },
    [getCellContent, updateCell]
  );

  const setCellComment = useCallback(
    (col: number, row: number, comment: string) => {
      if (!activeFlowId) return;
      const key = `${col}:${row}`;
      updateCells((prev) => {
        const existing = prev.get(key);
        const content = existing?.content ?? '';
        const color = existing?.color ?? null;
        const next = new Map(prev);
        next.set(key, { ...makeCell(activeFlowId, col, row, content, color), comment });
        return next;
      });
    },
    [activeFlowId, updateCells]
  );

  const bulkUpdateCells = useCallback(
    (updates: { col: number; row: number; content: string; color: CellColor; comment?: string }[]) => {
      if (!activeFlowId) return;
      updateCells((prev) => {
        const next = new Map(prev);
        for (const u of updates) {
          const key = `${u.col}:${u.row}`;
          const existing = next.get(key);
          const comment = u.comment !== undefined ? u.comment : (existing?.comment ?? '');
          next.set(key, { ...makeCell(activeFlowId, u.col, u.row, u.content, u.color), comment });
        }
        return next;
      });
    },
    [activeFlowId, updateCells]
  );

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

  const addFlow = useCallback(
    async (initiatedBy: 'aff' | 'neg', count = 1, tabKind: FlowTabKind = 'standard'): Promise<boolean> => {
      if (tabKind === 'cx' && flows.some((f) => f.tab_kind === 'cx')) return false;
      const created: Flow[] = [];
      const baseOrder = flows.length;
      const existingBySide = flows.filter((f) => f.initiated_by === initiatedBy).length;
      const prefix = tabKind === 'cx' ? 'CX' : initiatedBy === 'aff' ? 'AFF' : 'NEG';
      for (let i = 0; i < count; i++) {
        const id = `proto-${Date.now()}-${i}`;
        created.push({
          id,
          user_id: 'prototype',
          round_id: 'prototype-round',
          position_name: tabKind === 'cx' ? 'CX' : `${prefix} ${existingBySide + i + 1}`,
          initiated_by: tabKind === 'cx' ? 'aff' : initiatedBy,
          tab_kind: tabKind,
          display_order: baseOrder + i,
          created_at: NOW,
          updated_at: NOW,
        });
      }
      setFlows((prev) => [...prev, ...created]);
      setCellsByFlow((prev) => {
        const next = { ...prev };
        for (const flow of created) next[flow.id] = new Map();
        return next;
      });
      setActiveFlowId(created[created.length - 1].id);
      return true;
    },
    [flows]
  );

  const renameFlow = useCallback(async (id: string, name: string) => {
    setFlows((prev) => prev.map((f) => (f.id === id ? { ...f, position_name: name } : f)));
  }, []);

  const removeFlow = useCallback(async (id: string) => {
    setFlows((prev) => {
      const next = prev.filter((f) => f.id !== id);
      if (activeFlowId === id) setActiveFlowId(next[0]?.id ?? null);
      return next;
    });
    setCellsByFlow((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, [activeFlowId]);

  const reorderFlows = useCallback(async (reordered: Flow[]) => {
    setFlows(reordered.map((f, i) => ({ ...f, display_order: i })));
  }, []);

  const selectFlow = useCallback((id: string) => {
    setActiveFlowId(id);
  }, []);

  return {
    flows,
    activeFlowId,
    activeFlow: flows.find((f) => f.id === activeFlowId) ?? null,
    cells,
    loading: false,
    error: null,
    getCell: (col: number, row: number) => cells.get(`${col}:${row}`),
    getCellContent,
    getCellColor,
    getCellComment,
    setCellComment,
    updateCell,
    updateCellColor,
    bulkUpdateCells,
    getColumnRowCount,
    cellsRevision,
    saveNow: async () => {},
    addFlow,
    renameFlow,
    removeFlow,
    reorderFlows,
    selectFlow,
    reloadFlows: async () => {},
  };
}
