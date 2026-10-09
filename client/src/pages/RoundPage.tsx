import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import RoundWorkspace from '../components/RoundWorkspace';
import { useFlowGrid } from '../hooks/useFlowGrid';
import { RoundTimerProvider, useRoundTimer } from '../contexts/RoundTimerContext';
import { normalizeTimerPreset } from '../lib/timerPreset';
import * as api from '../db/api';
import type { Round, Tournament } from '../db/types';
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
  const [loadingMeta, setLoadingMeta] = useState(true);

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
      <RoundWorkspace roundId={id} tournament={tournament} grid={grid} />
    </Layout>
  );
}
