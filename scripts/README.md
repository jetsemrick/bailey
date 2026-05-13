# Scripts

## `apply-supabase-migrations.mjs`

Idempotent migration runner for the Bailey Supabase database. Reads
`client/src/db/migrations/NNN_*.sql` files in lexical order and applies any that
have not already been recorded in the `public._schema_migrations` tracker
table. Each migration runs inside its own transaction; on failure the
transaction rolls back and the run aborts.

### Usage

```bash
# Required: postgres connection string (Supabase pooler URI)
export DATABASE_URL='postgresql://USER:PASSWORD@HOST:6543/postgres?sslmode=require'

# Show pending vs applied
node scripts/apply-supabase-migrations.mjs --status

# Preview without writing
node scripts/apply-supabase-migrations.mjs --dry-run

# Apply pending migrations
node scripts/apply-supabase-migrations.mjs

# One-time bootstrap: record migrations 001..NNN as applied without running
# them. Use this on existing databases that already have those migrations
# applied manually.
node scripts/apply-supabase-migrations.mjs --bootstrap-up-to 011
```

### Connection string

In the Supabase dashboard go to *Project Settings → Database → Connection
string → URI* and copy the **Transaction pooler** (`pgbouncer`) URL (port
`6543`). Replace `[YOUR-PASSWORD]` with the database password from the same
page.

### How it works

1. Creates `public._schema_migrations` if missing
   (`version, name, checksum, applied_at`).
2. For each `NNN_name.sql` file:
   - **already recorded with same checksum** → skip
   - **already recorded with different checksum** → warn (drift)
   - **bootstrap mode and version ≤ threshold** → record without running
   - **otherwise** → run in a transaction, then insert tracker row
3. Errors abort the run and roll back the in-flight migration. Already-applied
   migrations are untouched.

### Local testing

The runner works against any PostgreSQL instance. To validate locally:

```bash
sudo apt-get install -y postgresql postgresql-client
sudo -u postgres createdb bailey_test
sudo -u postgres psql -d bailey_test -c "CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid';"

DATABASE_URL='postgresql://postgres@127.0.0.1:5432/bailey_test' \
  PGSSLMODE=disable \
  node scripts/apply-supabase-migrations.mjs --status
```
