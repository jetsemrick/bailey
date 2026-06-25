import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import Sidebar from '../components/Sidebar';
import FlowGrid from '../components/FlowGrid';
import FlowTabs from '../components/FlowTabs';
import FlowAnalytics from '../components/FlowAnalytics';
import RoundAnalytics from '../components/RoundAnalytics';
import DecisionView from '../components/DecisionView';
import NewFlowDialog from '../components/NewFlowDialog';
import { useFlowGrid } from '../hooks/useFlowGrid';
import { useFlowSheetVariant } from '../contexts/FlowSheetVariantContext';
import { RoundTimerProvider, useRoundTimer } from '../contexts/RoundTimerContext';
import { normalizeTimerPreset } from '../lib/timerPreset';
import * as api from '../db/api';
import type { FlowTabKind, Round, Tournament } from '../db/types';
import { formatRoundName } from '../db/types';

export default function RoundPage() {
  return (
    <RoundTimerProvider>
      <RoundPageInner />
    </RoundTimerProvider>
  );
}

function RoundPageInner() {
  const { setTimerPreset } = useRoundTimer();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [round, setRound] = useState<Round | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const grid = useFlowGrid(id, round);
  const { variant: flowSheetVariant, hideSidebar } = useFlowSheetVariant();
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [showNewFlow, setShowNewFlow] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [viewMode, setViewMode] = useState<'flow' | 'analytics' | 'split'>('flow');
  const [rebuttalFocus, setRebuttalFocus] = useState(true);
  /** Persists across Flow / Decision view switches (DecisionView unmounts). */
  const [decisionVisibleFlowIds, setDecisionVisibleFlowIds] = useState<Set<string>>(new Set());
  const decisionVisibilityReadyRef = useRef(false);
  const prevFlowIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const ids = new Set(grid.flows.map((f) => f.id));
    setDecisionVisibleFlowIds((prev) => {
      if (!decisionVisibilityReadyRef.current && ids.size > 0) {
        decisionVisibilityReadyRef.current = true;
        prevFlowIdsRef.current = new Set(ids);
        return new Set(ids);
      }
      if (ids.size === 0) {
        decisionVisibilityReadyRef.current = false;
        prevFlowIdsRef.current = new Set();
        return new Set();
      }
      const next = new Set<string>();
      for (const id of prev) {
        if (ids.has(id)) next.add(id);
      }
      for (const id of ids) {
        if (!prevFlowIdsRef.current.has(id)) {
          next.add(id);
        }
      }
      prevFlowIdsRef.current = new Set(ids);
      return next;
    });
  }, [grid.flows]);

  useEffect(() => {
    if (!id) return;
    setLoadingMeta(true);
    api.getRound(id)
      .then(async (r) => {
        setRound(r);
        const t = await api.getTournament(r.tournament_id);
        setTournament(t);
      })
      .catch(() => navigate('/'))
      .finally(() => setLoadingMeta(false));
  }, [id, navigate]);

  useEffect(() => {
    if (tournament) {
      setTimerPreset(normalizeTimerPreset(tournament.timer_preset));
    }
  }, [tournament, setTimerPreset]);

  // Select flow from URL when navigating from sidebar (e.g. ?flow=xxx)
  useEffect(() => {
    const flowId = searchParams.get('flow');
    if (!flowId || !grid.flows.length) return;
    const hasFlow = grid.flows.some((f) => f.id === flowId);
    if (hasFlow) {
      grid.selectFlow(flowId);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, grid.flows, grid.selectFlow, setSearchParams]);

  const handleAddFlow = async (
    initiatedBy: 'aff' | 'neg',
    count: number,
    tabKind: FlowTabKind = 'standard'
  ) => {
    const ok = await grid.addFlow(initiatedBy, count, tabKind);
    if (ok) setShowNewFlow(false);
  };

  if (loadingMeta || grid.loading) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center text-foreground/40 text-sm">Loading...</div>
      </Layout>
    );
  }

  const breadcrumbs = [];
  if (tournament) {
    breadcrumbs.push({ label: tournament.name, to: `/tournament/${tournament.id}` });
  }
  if (round) {
    breadcrumbs.push({
      label: formatRoundName(round, tournament?.team_name),
    });
  }

  return (
    <Layout breadcrumbs={breadcrumbs}>
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {!hideSidebar && (
          <Sidebar
            tournamentId={tournament?.id}
            activeRoundId={id}
            activeFlowId={grid.activeFlowId}
            activeRoundFlows={grid.flows}
            onFlowClick={(_, flowId) => grid.selectFlow(flowId)}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((v) => !v)}
          />
        )}

        {/* Main content */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          {/* Flow / Analytics view toggle */}
          <div className="shrink-0 flex border-b border-card-04 bg-card">
            <button
              onClick={() => setViewMode('flow')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'flow'
                  ? 'text-accent border-b-2 border-accent -mb-px'
                  : 'text-foreground/60 hover:text-foreground'
              }`}
            >
              Flow
            </button>
            <button
              onClick={() => setViewMode('analytics')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'analytics'
                  ? 'text-accent border-b-2 border-accent -mb-px'
                  : 'text-foreground/60 hover:text-foreground'
              }`}
            >
              Notes
            </button>
            {tournament?.tournament_type === 'judge' && (
              <button
                onClick={() => setViewMode('split')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'split'
                    ? 'text-accent border-b-2 border-accent -mb-px'
                    : 'text-foreground/60 hover:text-foreground'
                }`}
              >
                Decision
              </button>
            )}
            {viewMode === 'split' && (
              <div className="ml-auto flex items-center gap-2 pr-3">
                <span className="text-xs text-foreground/50">Rebuttal Focus</span>
                <button
                  onClick={() => setRebuttalFocus((v) => !v)}
                  className={`relative w-8 h-[18px] rounded-full transition-colors ${
                    rebuttalFocus ? 'bg-accent' : 'bg-card-04'
                  }`}
                  aria-label="Toggle rebuttal focus"
                >
                  <span
                    className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform ${
                      rebuttalFocus ? 'translate-x-[14px]' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            )}
          </div>

          {/* Grid area or Analytics */}
          {viewMode === 'split' && id ? (
            <div className="flex flex-1 overflow-hidden min-h-0">
              <div className="flex flex-col flex-1 min-w-0 border-r border-card-04">
                {rebuttalFocus ? (
                  <DecisionView
                    flows={grid.flows}
                    cellsRevision={grid.cellsRevision}
                    visibleFlowIds={decisionVisibleFlowIds}
                    onVisibleFlowIdsChange={setDecisionVisibleFlowIds}
                    variant={flowSheetVariant}
                  />
                ) : (
                  <FlowGrid grid={grid} defaultScrollToEnd variant={flowSheetVariant} />
                )}
              </div>
              <div className="flex flex-col w-[380px] shrink-0 min-h-0 bg-background">
                <RoundAnalytics roundId={id} isJudgeMode compact />
              </div>
            </div>
          ) : viewMode === 'flow' ? (
            <FlowGrid grid={grid} variant={flowSheetVariant} />
          ) : grid.activeFlow ? (
            <FlowAnalytics
              flow={grid.activeFlow}
            />
          ) : grid.flows.length === 0 && id ? (
            <RoundAnalytics roundId={id} isJudgeMode={tournament?.tournament_type === 'judge'} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-foreground/40 text-sm">
              Select a flow tab to view notes
            </div>
          )}

          {/* Tab bar */}
          <FlowTabs
            flows={grid.flows}
            activeFlowId={grid.activeFlowId}
            onSelect={grid.selectFlow}
            onAdd={() => setShowNewFlow(true)}
            onRename={grid.renameFlow}
            onDelete={grid.removeFlow}
            onReorder={grid.reorderFlows}
            variant={flowSheetVariant}
          />

          {/* Error bar */}
          {grid.error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-1.5 text-xs">
              {grid.error}
            </div>
          )}
        </div>
      </div>

      {/* New flow dialog */}
      {showNewFlow && (
        <NewFlowDialog
          hasCxTab={grid.flows.some((f) => f.tab_kind === 'cx')}
          onSubmit={handleAddFlow}
          onCancel={() => setShowNewFlow(false)}
        />
      )}
    </Layout>
  );
}
