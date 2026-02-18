import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import TournamentForm from '../components/TournamentForm';
import ConfirmModal from '../components/ConfirmModal';
import { useTournaments } from '../hooks/useTournaments';

export default function HomePage() {
  const { tournaments, loading, create, remove } = useTournaments();
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleCreate = async (data: { name: string; date: string | null; location: string | null; tournament_type: 'judge' | 'competitor'; team_name?: string | null }) => {
    try {
      const t = await create(data);
      setShowForm(false);
      navigate(`/tournament/${t.id}`, { state: { tournament_type: data.tournament_type, team_name: data.team_name } });
    } catch (err) {
      console.error('Failed to create tournament:', err);
      const msg = (err as { message?: string })?.message ?? (err instanceof Error ? err.message : 'Failed to create tournament');
      alert(msg);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteTarget(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await remove(deleteTarget);
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete tournament:', err);
    }
  };

  return (
    <Layout>
      <div className="flex-1 overflow-auto p-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Tournaments</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-1.5 bg-accent text-white rounded text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              + New Tournament
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-foreground/40 text-sm py-12 text-center">Loading...</div>
        ) : tournaments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-foreground/40 border-2 border-dashed border-card-04 rounded-lg">
            <p className="mb-3 text-sm">No tournaments yet</p>
            <button onClick={() => setShowForm(true)} className="text-accent text-sm hover:underline">
              Create your first tournament
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournaments.map((t) => (
              <div
                key={t.id}
                onClick={() => navigate(`/tournament/${t.id}`)}
                className="group bg-card border border-card-04 rounded-lg p-4 hover:border-accent/40 hover:shadow-sm transition-all cursor-pointer relative"
              >
                <h3 className="font-medium text-base mb-1 text-foreground group-hover:text-accent transition-colors">
                  {t.name}
                </h3>
                {t.date && (
                  <div className="text-xs text-foreground/50">
                    {new Date(t.date + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                )}
                {t.location && (
                  <div className="text-xs text-foreground/50">{t.location}</div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(t.id);
                  }}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 text-foreground/30 hover:text-red-500 transition-all"
                  title="Delete tournament"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteTarget && (
        <ConfirmModal
          title="Delete tournament?"
          message="This will permanently delete the tournament and all its rounds. This cannot be undone."
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {showForm && (
        <TournamentForm
          title="New Tournament"
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}
    </Layout>
  );
}
