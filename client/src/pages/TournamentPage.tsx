import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import RoundForm from '../components/RoundForm';
import TournamentForm from '../components/TournamentForm';
import { useRounds } from '../hooks/useRounds';
import * as api from '../db/api';
import type { Tournament } from '../db/types';
import { formatRoundName } from '../db/types';

export default function TournamentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const stateTournamentType = (location.state as { tournament_type?: 'judge' | 'competitor'; team_name?: string } | null)?.tournament_type;
  const stateTeamName = (location.state as { team_name?: string } | null)?.team_name;
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loadingT, setLoadingT] = useState(true);
  const { rounds, loading: loadingR, create, update, remove } = useRounds(id);
  const [showRoundForm, setShowRoundForm] = useState(false);
  const [editingRound, setEditingRound] = useState<string | null>(null);
  const [showEditTournament, setShowEditTournament] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoadingT(true);
    api.getTournament(id)
      .then(setTournament)
      .catch(() => navigate('/'))
      .finally(() => setLoadingT(false));
  }, [id, navigate]);

  const handleCreateRound = async (data: Parameters<typeof create>[0]) => {
    await create(data);
    setShowRoundForm(false);
  };

  const handleUpdateRound = async (roundId: string, data: Parameters<typeof update>[1]) => {
    await update(roundId, data);
    setEditingRound(null);
  };

  const handleDeleteRound = async (roundId: string) => {
    if (!window.confirm('Delete this round and all its flows?')) return;
    await remove(roundId);
  };

  const handleUpdateTournament = async (data: { name: string; date: string | null; location: string | null; tournament_type: 'judge' | 'competitor'; team_name?: string | null }) => {
    if (!id) return;
    try {
      const updated = await api.updateTournament(id, data);
      setTournament(updated);
      setShowEditTournament(false);
    } catch (err) {
      console.error('Failed to update tournament:', err);
      const msg = (err as { message?: string })?.message ?? (err instanceof Error ? err.message : 'Failed to update tournament');
      alert(msg);
    }
  };

  if (loadingT) {
    return <Layout><div className="flex-1 flex items-center justify-center text-foreground/40 text-sm">Loading...</div></Layout>;
  }

  if (!tournament) {
    return <Layout><div className="flex-1 flex items-center justify-center text-foreground/40 text-sm">Tournament not found</div></Layout>;
  }

  const editingRoundData = editingRound ? rounds.find((r) => r.id === editingRound) : null;

  return (
    <Layout breadcrumbs={[{ label: tournament.name }]}>
      <div className="flex-1 overflow-auto p-6 max-w-4xl mx-auto w-full">
        {/* Tournament header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2
              className="text-xl font-semibold cursor-pointer hover:text-accent transition-colors"
              onClick={() => setShowEditTournament(true)}
              title="Click to edit"
            >
              {tournament.name}
            </h2>
            <div className="flex gap-3 text-xs text-foreground/50 mt-1">
              {tournament.date && <span>{tournament.date}</span>}
              {tournament.location && <span>{tournament.location}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRoundForm(true)}
              className="px-4 py-1.5 bg-accent text-white rounded text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              + Add Round
            </button>
          </div>
        </div>

        {/* Rounds list */}
        {loadingR ? (
          <div className="text-foreground/40 text-sm py-8 text-center">Loading rounds...</div>
        ) : rounds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-foreground/40 border-2 border-dashed border-card-04 rounded-lg">
            <p className="mb-3 text-sm">No rounds yet</p>
            <button onClick={() => setShowRoundForm(true)} className="text-accent text-sm hover:underline">
              Add your first round
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {rounds.map((r) => (
              <div
                key={r.id}
                className="group flex items-center gap-4 bg-card border border-card-04 rounded-lg px-4 py-3 hover:border-accent/40 transition-colors cursor-pointer"
                onClick={() => navigate(`/round/${r.id}`)}
              >
                <div className="w-12 text-center">
                  <span className="text-lg font-bold text-foreground">{r.round_number}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {formatRoundName(r, tournament.team_name ?? stateTeamName)}
                  </div>
                  {(tournament.tournament_type ?? stateTournamentType) !== 'judge' && (
                    <div className="text-xs text-foreground/50">
                      <span className={r.side === 'aff' ? 'text-blue-500' : 'text-red-500'}>
                        {r.side === 'aff' ? 'Affirmative' : 'Negative'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="w-10 text-center">
                  {(tournament.tournament_type ?? stateTournamentType) !== 'judge' && r.result && (
                    <span
                      className={`text-sm font-bold ${
                        r.result === 'W' ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      {r.result}
                    </span>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingRound(r.id); }}
                    className="p-1.5 text-foreground/30 hover:text-foreground transition-colors"
                    title="Edit round"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteRound(r.id); }}
                    className="p-1.5 text-foreground/30 hover:text-red-500 transition-colors"
                    title="Delete round"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showRoundForm && (
        <RoundForm
          title="Add Round"
          initial={{
            round_number: rounds.length + 1,
            opponent: '',
            team_aff: '',
            team_neg: '',
            side: 'aff',
            result: null,
          }}
          onSubmit={handleCreateRound}
          onCancel={() => setShowRoundForm(false)}
          isJudgeMode={(tournament.tournament_type ?? stateTournamentType) === 'judge'}
          teamName={tournament.team_name ?? stateTeamName ?? undefined}
        />
      )}

      {editingRoundData && (
        <RoundForm
          title="Edit Round"
          initial={{
            round_number: editingRoundData.round_number,
            opponent: editingRoundData.opponent,
            team_aff: editingRoundData.team_aff ?? '',
            team_neg: editingRoundData.team_neg ?? '',
            side: editingRoundData.side,
            result: editingRoundData.result,
          }}
          onSubmit={(data) => handleUpdateRound(editingRoundData.id, data)}
          onCancel={() => setEditingRound(null)}
          isJudgeMode={(tournament.tournament_type ?? stateTournamentType) === 'judge'}
          teamName={tournament.team_name ?? stateTeamName ?? undefined}
        />
      )}

      {showEditTournament && (
        <TournamentForm
          title="Edit Tournament"
          initial={{
            name: tournament.name,
            date: tournament.date ?? '',
            location: tournament.location ?? '',
            tournament_type: tournament.tournament_type ?? stateTournamentType ?? 'competitor',
            team_name: tournament.team_name ?? '',
          }}
          onSubmit={handleUpdateTournament}
          onCancel={() => setShowEditTournament(false)}
        />
      )}
    </Layout>
  );
}
