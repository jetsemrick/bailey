import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import FlowGrid from '../components/FlowGrid';
import FlowTabs from '../components/FlowTabs';
import Timer from '../components/Timer';
import NewFlowDialog from '../components/NewFlowDialog';
import { useFlowGrid } from '../hooks/useFlowGrid';
import * as api from '../db/api';
import type { Round, Tournament } from '../db/types';

export default function RoundPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const grid = useFlowGrid(id);

  const [round, setRound] = useState<Round | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [showNewFlow, setShowNewFlow] = useState(false);

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

  const handleAddFlow = async (positionName: string, initiatedBy: 'aff' | 'neg') => {
    await grid.addFlow(positionName, initiatedBy);
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
      label: `Round ${round.round_number}${round.opponent ? ` vs ${round.opponent}` : ''}`,
    });
  }

  return (
    <Layout breadcrumbs={breadcrumbs}>
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Grid area */}
        <FlowGrid grid={grid} />

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

      {/* Timer */}
      <Timer />

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
