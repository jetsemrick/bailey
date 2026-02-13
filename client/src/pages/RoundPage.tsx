import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Sidebar from '../components/Sidebar';
import FlowGrid from '../components/FlowGrid';
import FlowTabs from '../components/FlowTabs';
import Timer from '../components/Timer';
import NewFlowDialog from '../components/NewFlowDialog';
import { useFlowGrid } from '../hooks/useFlowGrid';
import * as api from '../db/api';
import type { Round, Tournament } from '../db/types';
import type { ExportedRound } from '../db/api';

export default function RoundPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const grid = useFlowGrid(id);

  const [round, setRound] = useState<Round | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [showNewFlow, setShowNewFlow] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddFlow = async (positionName: string, initiatedBy: 'aff' | 'neg') => {
    await grid.addFlow(positionName, initiatedBy);
    setShowNewFlow(false);
  };

  const handleExportRound = async () => {
    if (!id || !round) return;
    try {
      const data = await api.exportRound(id);
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (round.opponent || `round-${round.round_number}`).replace(/[^a-zA-Z0-9]/g, '-');
      a.download = `bailey-round-${safeName}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleImportRound = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !round) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as ExportedRound;
      if (!data.round) throw new Error('Invalid round file');
      const newRoundId = await api.importRound(round.tournament_id, data);
      navigate(`/round/${newRoundId}`);
    } catch (err) {
      console.error('Import failed:', err);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
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

  const roundActions = (
    <div className="flex items-center gap-1">
      <button
        onClick={handleExportRound}
        className="px-2 py-1 text-xs bg-card-02 text-foreground/70 rounded hover:bg-card-03 transition-colors"
        title="Export this round as JSON"
      >
        Export
      </button>
      <label
        className="px-2 py-1 text-xs bg-card-02 text-foreground/70 rounded hover:bg-card-03 transition-colors cursor-pointer"
        title="Import a round from JSON"
      >
        Import
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportRound}
          className="hidden"
        />
      </label>
    </div>
  );

  return (
    <Layout breadcrumbs={breadcrumbs} headerActions={roundActions}>
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeRoundId={id}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
        />

        {/* Main content */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
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
