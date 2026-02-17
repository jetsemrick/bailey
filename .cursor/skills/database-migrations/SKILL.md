---
name: database-migrations
description: Checks for database schema alignment when adding fields or making edits that persist data. Use when adding new form fields, API payload fields, or entity properties that map to database columns. Ensures migrations exist and are applied before code changes.
---

# Database Migrations

## When to Apply

Apply this skill when:

- Adding new fields to forms that persist to a database
- Extending API types or payloads with new properties
- Adding columns to entities (tournaments, rounds, flows, etc.)
- Changing schema in `schema.sql` or types in `db/types.ts`

## Checklist

Before or immediately after making such changes:

1. **Identify the table** – Which Supabase/Postgres table is affected?
2. **Check migrations** – Does `client/src/db/migrations/` have a migration for this change?
3. **Create migration if missing** – Add a new `NNN_description.sql` file with `ALTER TABLE` or `CREATE TABLE` as needed
4. **Apply the migration** – Run it in the Supabase SQL Editor (Dashboard > SQL Editor)
5. **Verify** – If Save/Submit fails with a column-not-found or similar error, the migration was likely not applied

## Migration File Pattern

```
client/src/db/migrations/NNN_description.sql
```

Example:

```sql
-- Add tournament_type: judge or competitor
-- Run in Supabase SQL Editor if you have an existing database.

ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS tournament_type text 
  CHECK (tournament_type IN ('judge', 'competitor')) DEFAULT 'competitor';
```

## Common Failure Mode

**Symptom**: Save/Submit button does nothing or fails silently.

**Cause**: Code sends a new field (e.g. `tournament_type`) in the insert/update, but the database column does not exist. Supabase returns an error; the UI may not surface it.

**Fix**: Run the corresponding migration in Supabase SQL Editor.

## Project Conventions

- Migrations live in `client/src/db/migrations/`
- Main schema: `client/src/db/schema.sql` (for fresh installs)
- Types: `client/src/db/types.ts`
- API: `client/src/db/api.ts`
