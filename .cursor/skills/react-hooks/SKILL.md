---
name: react-hooks
description: Create and modify custom React hooks that wrap Supabase API calls with loading/error state. Use when adding a new hook, extending an existing hook with CRUD operations, or refactoring data-fetching logic in Bailey.
---

# React Hooks

## When to Apply

- Adding a new data hook (e.g. `useFlowAnalytics`, `useDecisions`)
- Adding CRUD methods to an existing hook
- Refactoring component-level API calls into a reusable hook

## Hook Template

Follow the pattern established by `useRounds`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { MyEntity } from '../db/types';
import * as api from '../db/api';

export function useMyEntity(parentId: string | undefined) {
  const [items, setItems] = useState<MyEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!parentId) {
      setItems([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await api.listMyEntities(parentId);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [parentId]);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(
    async (fields: Parameters<typeof api.createMyEntity>[1]) => {
      if (!parentId) return;
      const item = await api.createMyEntity(parentId, fields);
      setItems((prev) => [...prev, item]);
      return item;
    },
    [parentId]
  );

  const update = useCallback(
    async (id: string, fields: Parameters<typeof api.updateMyEntity>[1]) => {
      const item = await api.updateMyEntity(id, fields);
      setItems((prev) => prev.map((x) => (x.id === id ? item : x)));
      return item;
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    await api.deleteMyEntity(id);
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return { items, loading, error, reload: load, create, update, remove };
}
```

## Conventions

- **Guard on parent ID**: If `parentId` is undefined, reset state and skip the fetch.
- **Optimistic local state**: After a successful API call, update local state directly instead of refetching.
- **Error as string**: Catch errors and store `err.message`; let the consuming component decide how to display.
- **useCallback everything**: Wrap `load`, `create`, `update`, `remove` in `useCallback` with minimal deps.
- **Derive field types from API**: Use `Parameters<typeof api.someFunction>[N]` instead of duplicating Pick types.
- **Return shape**: `{ items, loading, error, reload, create, update, remove }` -- consumers destructure what they need.
- **File location**: `client/src/hooks/useEntityName.ts`
