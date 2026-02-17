import { useState, useEffect, useCallback } from 'react';
import type { Round } from '../db/types';
import * as api from '../db/api';

export function useRounds(tournamentId: string | undefined) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tournamentId) {
      setRounds([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await api.listRounds(tournamentId);
      setRounds(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rounds');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async (fields: Parameters<typeof api.createRound>[1]) => {
      if (!tournamentId) return;
      const r = await api.createRound(tournamentId, fields);
      setRounds((prev) => [...prev, r].sort((a, b) => a.round_number - b.round_number));
      return r;
    },
    [tournamentId]
  );

  const update = useCallback(
    async (id: string, fields: Parameters<typeof api.updateRound>[1]) => {
      const r = await api.updateRound(id, fields);
      setRounds((prev) =>
        prev.map((x) => (x.id === id ? r : x)).sort((a, b) => a.round_number - b.round_number)
      );
      return r;
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    await api.deleteRound(id);
    setRounds((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return { rounds, loading, error, reload: load, create, update, remove };
}
