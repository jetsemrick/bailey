import { useCallback, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import RoundWorkspace from '../components/RoundWorkspace';
import { RoundTimerProvider } from '../contexts/RoundTimerContext';
import type { useFlowGrid, SaveStatus } from '../hooks/useFlowGrid';
import type { CellColor, Flow, FlowCell, FlowTabKind, FlowTabTemplateTab, Round, Tournament } from '../db/types';
import { formatRoundName } from '../db/types';
import { AuthContext, type AuthState } from '../auth/AuthContext';
import type { User } from '@supabase/supabase-js';

/**
 * Dev-only round page backed by an in-memory grid, so the round/flow UI can be
 * exercised and screenshotted without Supabase credentials or seeded rows.
 * Mounted at /round/__fixture only when import.meta.env.DEV is true.
 */

type FlowGridApi = ReturnType<typeof useFlowGrid>;
type CellMap = Map<string, FlowCell>;

const NOW = '2026-10-01T00:00:00.000Z';

const TOURNAMENT: Tournament = {
  id: 'fixture-tournament',
  user_id: 'fixture-user',
  name: 'Taiwan Debate Invitational',
  date: '2026-10-03',
  location: 'Taipei',
  tournament_type: 'judge',
  team_name: null,
  timer_preset: 'high_school',
  created_at: NOW,
  updated_at: NOW,
};

const ROUND: Round = {
  id: '__fixture',
  user_id: 'fixture-user',
  tournament_id: TOURNAMENT.id,
  round_number: 2,
  opponent: '',
  team_aff: 'TAS TW',
  team_neg: 'American School in Japan AS',
  side: 'aff',
  result: null,
  created_at: NOW,
  updated_at: NOW,
};

const FLOW_SEED: { name: string; by: 'aff' | 'neg'; kind?: FlowTabKind; cols?: Record<number, string[]> }[] = [
  {
    name: 'Case',
    by: 'aff',
    cols: {
      0: ['Inherency — signing statements unchecked', 'Adv 1: Separation of powers', 'Adv 2: Rule of law', 'Plan: Congress bans signing statements'],
      1: ['No inherency — Biden rarely uses them', 'SoP resilient — courts check', 'Rule of law is a myth'],
      2: ['Usage up 40% — CRS 24', 'Courts defer — Yoo 22', 'Extend Adv 2 impacts'],
      3: ['Turn: legislative overreach', 'Courts check — Ikenberry'],
      4: ['Extend inherency', 'Group SoP args'],
    },
  },
  { name: 'Cap K', by: 'neg', cols: { 1: ['Link: policy focus', 'Impact: fascism', 'Alt: movement-building'], 2: ['Perm do both', 'Cap good — growth'] } },
  { name: 'Cost', by: 'neg', cols: { 1: ['Plan costs political capital'], 2: ['No link — bipartisan'] } },
  { name: 'Inequality', by: 'neg' },
  { name: 'Multiplay T', by: 'neg', cols: { 1: ['Interp: one actor', 'Violation', 'Standards: limits'] } },
  { name: 'Maid DA', by: 'neg' },
  {
    name: 'Signing Statements CP',
    by: 'neg',
    cols: {
      1: [
        'CP: The executive should issue an EO ceasing signing statements',
        'Solves case — compliance is high',
        'Net benefit: Courts DA',
      ],
      2: [
        'Perm do the CP',
        'Delay is anti-utility and speculative.',
        'Rollback — next president revokes',
        'Links to the net benefit',
      ],
      3: [
        'Delay is small and speculative.',
        'Ikenberry, CP strengthens the separation of powers.',
        "Doesn't say signing statements never happen.",
        'Signing statements — Yu 16.',
        'Normal status quo litigation, congress sues',
        'The CP is more important, not less.',
      ],
      4: ['Extend perm', 'Rollback outweighs'],
      5: ['CP solves 100% of case', 'Rollback is non-unique'],
    },
  },
  { name: 'CX', by: 'aff', kind: 'cx', cols: { 0: ['What is the mechanism?'], 1: ['Who enforces?'] } },
];

function seed(): { flows: Flow[]; cells: Map<string, CellMap> } {
  const flows: Flow[] = [];
  const cells = new Map<string, CellMap>();
  FLOW_SEED.forEach((s, i) => {
    const id = `fixture-flow-${i}`;
    flows.push({
      id,
      user_id: 'fixture-user',
      round_id: ROUND.id,
      position_name: s.name,
      initiated_by: s.by,
      tab_kind: s.kind ?? 'standard',
      display_order: i,
      created_at: NOW,
      updated_at: NOW,
    });
    const map: CellMap = new Map();
    for (const [col, rows] of Object.entries(s.cols ?? {})) {
      rows.forEach((content, row) => {
        map.set(`${col}:${row}`, makeCell(id, Number(col), row, content, null, ''));
      });
    }
    if (s.name === 'Signing Statements CP') {
      const c = map.get('3:1');
      if (c) map.set('3:1', { ...c, color: 'yellow', comment: 'Card read from 1NC evidence' });
    }
    cells.set(id, map);
  });
  return { flows, cells };
}

function makeCell(flowId: string, col: number, row: number, content: string, color: CellColor, comment: string): FlowCell {
  return {
    id: `${flowId}:${col}:${row}`,
    user_id: 'fixture-user',
    flow_id: flowId,
    column_index: col,
    row_index: row,
    content,
    color,
    comment,
    created_at: NOW,
    updated_at: NOW,
  };
}

function useFixtureFlowGrid(): FlowGridApi {
  const initial = useMemo(seed, []);
  const [flows, setFlows] = useState<Flow[]>(initial.flows);
  const [cellsByFlow, setCellsByFlow] = useState(initial.cells);
  const [activeFlowId, setActiveFlowId] = useState<string | null>(initial.flows[6].id);
  const cells = useMemo(() => (activeFlowId ? cellsByFlow.get(activeFlowId) : undefined) ?? new Map<string, FlowCell>(), [cellsByFlow, activeFlowId]);

  const patch = useCallback(
    (updates: { col: number; row: number; content?: string; color?: CellColor; comment?: string }[]) => {
      if (!activeFlowId) return;
      setCellsByFlow((prev) => {
        const next = new Map(prev);
        const map = new Map(next.get(activeFlowId) ?? []);
        for (const u of updates) {
          const key = `${u.col}:${u.row}`;
          const cur = map.get(key) ?? makeCell(activeFlowId, u.col, u.row, '', null, '');
          map.set(key, {
            ...cur,
            content: u.content ?? cur.content,
            color: u.color !== undefined ? u.color : cur.color,
            comment: u.comment ?? cur.comment,
          });
        }
        next.set(activeFlowId, map);
        return next;
      });
    },
    [activeFlowId]
  );

  const getCell = useCallback((col: number, row: number) => cells.get(`${col}:${row}`), [cells]);
  const getCellContent = useCallback((col: number, row: number) => cells.get(`${col}:${row}`)?.content ?? '', [cells]);
  const getCellColor = useCallback((col: number, row: number): CellColor => cells.get(`${col}:${row}`)?.color ?? null, [cells]);
  const getCellComment = useCallback((col: number, row: number) => cells.get(`${col}:${row}`)?.comment ?? '', [cells]);
  const getColumnRowCount = useCallback(
    (col: number) => {
      let max = -1;
      for (const c of cells.values()) {
        if (c.column_index === col && c.content.trim() !== '') max = Math.max(max, c.row_index);
      }
      return max + 1;
    },
    [cells]
  );

  const addFlowsFromTabs = useCallback((tabs: { position_name: string; initiated_by: 'aff' | 'neg'; tab_kind?: FlowTabKind }[]) => {
    setFlows((prev) => {
      const added = tabs.map((t, i) => ({
        id: `fixture-flow-new-${Date.now()}-${i}`,
        user_id: 'fixture-user',
        round_id: ROUND.id,
        position_name: t.position_name,
        initiated_by: t.initiated_by,
        tab_kind: t.tab_kind ?? 'standard',
        display_order: prev.length + i,
        created_at: NOW,
        updated_at: NOW,
      }));
      if (added[0]) setActiveFlowId(added[0].id);
      return [...prev, ...added];
    });
    return true;
  }, []);

  return {
    flows,
    activeFlowId,
    activeFlow: flows.find((f) => f.id === activeFlowId) ?? null,
    cells,
    loading: false,
    error: null,
    saveStatus: 'idle' as SaveStatus,
    isOnline: true,
    pendingCount: 0,
    getCell,
    getCellContent,
    getCellColor,
    getCellComment,
    setCellComment: (col: number, row: number, comment: string) => patch([{ col, row, comment }]),
    updateCell: (col: number, row: number, content: string, color?: CellColor) => patch([{ col, row, content, color }]),
    updateCellColor: (col: number, row: number, color: CellColor) => patch([{ col, row, color }]),
    bulkUpdateCells: (updates: { col: number; row: number; content: string; color: CellColor; comment?: string }[]) => patch(updates),
    getColumnRowCount,
    savedFlowRevisions: new Map<string, number>(),
    saveNow: async () => {},
    addFlow: async (initiatedBy: 'aff' | 'neg', count = 1, tabKind: FlowTabKind = 'standard') =>
      addFlowsFromTabs(
        Array.from({ length: count }, (_, i) => ({
          position_name: tabKind === 'cx' ? 'CX' : `New ${initiatedBy.toUpperCase()} ${i + 1}`,
          initiated_by: initiatedBy,
          tab_kind: tabKind,
        }))
      ),
    addFlowFromTemplate: async (tabs: FlowTabTemplateTab[]) => addFlowsFromTabs(tabs),
    renameFlow: async (id: string, name: string) => {
      setFlows((prev) => prev.map((f) => (f.id === id ? { ...f, position_name: name } : f)));
    },
    removeFlow: async (id: string) => {
      setFlows((prev) => prev.filter((f) => f.id !== id));
      setActiveFlowId((cur) => (cur === id ? null : cur));
    },
    reorderFlows: async (reordered: Flow[]) => setFlows(reordered),
    selectFlow: setActiveFlowId,
    reloadFlows: async () => {},
  } as FlowGridApi;
}

const FIXTURE_AUTH: AuthState = {
  user: { id: 'fixture-user', email: 'judge@example.com' } as User,
  session: null,
  profile: null,
  role: 'User',
  isAdmin: false,
  loading: false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  sendPasswordResetEmail: async () => ({ error: null }),
  requestPasswordReset: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
};

export default function RoundFixturePage() {
  return (
    <AuthContext.Provider value={FIXTURE_AUTH}>
      <RoundTimerProvider>
        <RoundFixtureInner />
      </RoundTimerProvider>
    </AuthContext.Provider>
  );
}

function RoundFixtureInner() {
  const grid = useFixtureFlowGrid();
  return (
    <Layout
      breadcrumbs={[
        { label: TOURNAMENT.name, to: '/' },
        { label: formatRoundName(ROUND, TOURNAMENT.team_name) },
      ]}
    >
      <RoundWorkspace roundId={ROUND.id} tournament={TOURNAMENT} grid={grid} />
    </Layout>
  );
}
