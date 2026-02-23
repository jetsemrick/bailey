---
name: supabase-api
description: Add or modify Supabase API functions in the Bailey data layer. Use when creating new CRUD endpoints, adding query functions, or extending the API surface in client/src/db/api.ts.
---

# Supabase API Layer

## When to Apply

- Adding CRUD functions for a new or existing table
- Adding specialized queries (filters, joins, aggregations)
- Modifying insert/update field sets

## File Locations

| File | Purpose |
|------|---------|
| `client/src/db/api.ts` | All Supabase query functions |
| `client/src/db/types.ts` | TypeScript interfaces matching DB tables |
| `client/src/db/supabase.ts` | Supabase client singleton |
| `client/src/db/schema.sql` | Full schema for fresh installs |
| `client/src/db/migrations/` | Incremental schema changes |

## Function Patterns

### List

```typescript
export async function listItems(parentId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('parent_id', parentId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
```

### Get Single

```typescript
export async function getItem(id: string): Promise<Item> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}
```

### Create

```typescript
export async function createItem(
  parentId: string,
  fields: Partial<Pick<Item, 'name' | 'value'>>
): Promise<Item> {
  const userId = await uid();
  const { data, error } = await supabase
    .from('items')
    .insert({ user_id: userId, parent_id: parentId, ...fields })
    .select()
    .single();
  if (error) throw error;
  return data;
}
```

### Update

```typescript
export async function updateItem(
  id: string,
  fields: Partial<Pick<Item, 'name' | 'value'>>
): Promise<Item> {
  const { data, error } = await supabase
    .from('items')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
```

### Delete

```typescript
export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', id);
  if (error) throw error;
}
```

### Upsert

```typescript
export async function upsertItem(
  parentId: string,
  fields: { key_col: string; value: string }
): Promise<Item> {
  const userId = await uid();
  const { data, error } = await supabase
    .from('items')
    .upsert(
      { user_id: userId, parent_id: parentId, ...fields },
      { onConflict: 'parent_id,key_col' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}
```

## Checklist

When adding a new API function:

1. Add/verify the TypeScript interface in `types.ts`
2. Write the function in `api.ts` following the patterns above
3. Create a migration if the table or columns are new
4. Create or update the corresponding hook in `hooks/`
5. Update tests if they exist
