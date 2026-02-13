import { useState, useEffect, useCallback } from 'react';
import type { Tournament } from '../db/types';
import * as api from '../db/api';

export function useTournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.listTournaments();
      setTournaments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async (fields: Parameters<typeof api.createTournament>[0]) => {
      const t = await api.createTournament(fields);
      setTournaments((prev) => [t, ...prev]);
      return t;
    },
    []
  );

  const update = useCallback(
    async (id: string, fields: Parameters<typeof api.updateTournament>[1]) => {
      const t = await api.updateTournament(id, fields);
      setTournaments((prev) => prev.map((x) => (x.id === id ? t : x)));
      return t;
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    await api.deleteTournament(id);
    setTournaments((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return { tournaments, loading, error, reload: load, create, update, remove };
}
