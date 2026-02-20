import { useState, useEffect } from 'react';
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
import * as api from '../db/api';
import type { Round, Tournament } from '../db/types';
import { formatRoundName } from '../db/types';

export default function RoundPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [round, setRound] = useState<Round | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const grid = useFlowGrid(id, round);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [showNewFlow, setShowNewFlow] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [viewMode, setViewMode] = useState<'flow' | 'analytics' | 'split'>('flow');
  const [rebuttalFocus, setRebuttalFocus] = useState(true);

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

  const handleAddFlow = async (initiatedBy: 'aff' | 'neg', count: number) => {
    await grid.addFlow(initiatedBy, count);
    setShowNewFlow(false);
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
        <Sidebar
          tournamentId={tournament?.id}
          activeRoundId={id}
          activeFlowId={grid.activeFlowId}
          activeRoundFlows={grid.flows}
          onFlowClick={(_, flowId) => grid.selectFlow(flowId)}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
        />

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
                  <DecisionView flows={grid.flows} roundId={id} />
                ) : (
                  <FlowGrid grid={grid} defaultScrollToEnd />
                )}
              </div>
              <div className="flex flex-col w-[380px] shrink-0 min-h-0 bg-background">
                <RoundAnalytics roundId={id} isJudgeMode compact />
              </div>
            </div>
          ) : viewMode === 'flow' ? (
            <FlowGrid grid={grid} />
          ) : grid.activeFlow ? (
            <FlowAnalytics
              flow={grid.activeFlow}
              getCellContent={grid.getCellContent}
              getColumnRowCount={grid.getColumnRowCount}
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
          onSubmit={handleAddFlow}
          onCancel={() => setShowNewFlow(false)}
        />
      )}
    </Layout>
  );
}
