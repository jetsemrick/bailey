import { useState, useEffect, useCallback } from 'react';
import type { FlowTabTemplate, FlowTabTemplateTab } from '../db/types';
import * as api from '../db/api';

export function useFlowTabTemplates() {
  const [templates, setTemplates] = useState<FlowTabTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.listFlowTabTemplates();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async (fields: { name: string; tabs: FlowTabTemplateTab[] }) => {
      const template = await api.createFlowTabTemplate(fields);
      setTemplates((prev) => [...prev, template].sort((a, b) => a.name.localeCompare(b.name)));
      return template;
    },
    []
  );

  const update = useCallback(
    async (id: string, fields: Partial<{ name: string; tabs: FlowTabTemplateTab[] }>) => {
      const template = await api.updateFlowTabTemplate(id, fields);
      setTemplates((prev) => 
        prev.map((t) => (t.id === id ? template : t)).sort((a, b) => a.name.localeCompare(b.name))
      );
      return template;
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    await api.deleteFlowTabTemplate(id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { templates, loading, error, reload: load, create, update, remove };
}
