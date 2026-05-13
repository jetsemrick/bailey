#!/usr/bin/env node
// Idempotent migration runner for Bailey's Supabase database.
//
// Reads `client/src/db/migrations/NNN_*.sql` files in lexical order and applies
// any that have not yet been recorded in `public._schema_migrations`. Each
// migration runs inside its own transaction; if it fails, the transaction is
// rolled back and the run aborts (no partial state recorded).
//
// Modes:
//   default               apply pending migrations
//   --dry-run             report what would be applied without running
//   --bootstrap-up-to NNN record migrations 001..NNN as applied without
//                         executing them. Use once on existing databases that
//                         already have those migrations applied manually.
//   --status              print which migrations are applied vs pending
//
// Required env:
//   DATABASE_URL          postgres connection string (Supabase pooler URL)
//                         May also be provided via SUPABASE_DB_URL.
//
// Optional env:
//   MIGRATIONS_DIR        defaults to client/src/db/migrations
//   PGSSLMODE             defaults to require for *.supabase.* hosts.

import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import process from 'node:process';
import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR || 'client/src/db/migrations';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const STATUS_ONLY = args.includes('--status');
const bootstrapIdx = args.indexOf('--bootstrap-up-to');
const BOOTSTRAP_UP_TO = bootstrapIdx >= 0 ? args[bootstrapIdx + 1] : null;

if (!DATABASE_URL) {
  console.error('error: DATABASE_URL (or SUPABASE_DB_URL) is required');
  process.exit(2);
}

if (BOOTSTRAP_UP_TO && !/^\d+$/.test(BOOTSTRAP_UP_TO)) {
  console.error(`error: --bootstrap-up-to expects a numeric version (e.g. 011), got: ${BOOTSTRAP_UP_TO}`);
  process.exit(2);
}

function shouldUseSsl(connStr) {
  try {
    const u = new URL(connStr);
    if (u.searchParams.get('sslmode') === 'disable') return false;
    if (process.env.PGSSLMODE === 'disable') return false;
    return /supabase\.(co|com|net)$/i.test(u.hostname);
  } catch {
    return false;
  }
}

async function listMigrationFiles() {
  const entries = await readdir(MIGRATIONS_DIR);
  const files = entries
    .filter((f) => f.endsWith('.sql'))
    .map((f) => {
      const m = f.match(/^(\d+)_([^.]+)\.sql$/);
      if (!m) {
        throw new Error(`Migration file does not match NNN_name.sql: ${f}`);
      }
      return { file: f, version: m[1], name: m[2] };
    })
    .sort((a, b) => (a.version < b.version ? -1 : a.version > b.version ? 1 : 0));
  // Detect duplicate version numbers.
  const seen = new Set();
  for (const m of files) {
    if (seen.has(m.version)) {
      throw new Error(`Duplicate migration version: ${m.version}`);
    }
    seen.add(m.version);
  }
  return files;
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public._schema_migrations (
      version text PRIMARY KEY,
      name text NOT NULL,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

async function loadAppliedVersions(client) {
  const { rows } = await client.query(
    'SELECT version, name, checksum, applied_at FROM public._schema_migrations'
  );
  return new Map(rows.map((r) => [r.version, r]));
}

function fmt(ver, name) {
  return `${ver}_${name}`;
}

async function runMigration(client, mig, sql, checksum) {
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query(
      'INSERT INTO public._schema_migrations (version, name, checksum) VALUES ($1, $2, $3)',
      [mig.version, mig.name, checksum]
    );
    await client.query('COMMIT');
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('  rollback failed:', rollbackErr.message);
    }
    throw err;
  }
}

async function main() {
  const ssl = shouldUseSsl(DATABASE_URL) ? { rejectUnauthorized: false } : false;
  const client = new pg.Client({ connectionString: DATABASE_URL, ssl });
  await client.connect();

  let exitCode = 0;
  try {
    const files = await listMigrationFiles();
    await ensureMigrationsTable(client);
    const applied = await loadAppliedVersions(client);

    const summary = { applied: 0, pending: 0, bootstrapped: 0, drift: 0 };

    for (const mig of files) {
      const path = resolve(MIGRATIONS_DIR, mig.file);
      const sql = await readFile(path, 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const isApplied = applied.has(mig.version);

      if (isApplied) {
        const recorded = applied.get(mig.version);
        if (recorded.checksum !== checksum) {
          console.warn(`! ${fmt(mig.version, mig.name)} - checksum drift (file changed since apply)`);
          summary.drift += 1;
        } else if (STATUS_ONLY) {
          console.log(`= ${fmt(mig.version, mig.name)} - applied at ${recorded.applied_at.toISOString()}`);
        }
        summary.applied += 1;
        continue;
      }

      if (BOOTSTRAP_UP_TO && mig.version <= BOOTSTRAP_UP_TO) {
        if (DRY_RUN || STATUS_ONLY) {
          console.log(`b ${fmt(mig.version, mig.name)} - would record as applied (bootstrap)`);
        } else {
          await client.query(
            'INSERT INTO public._schema_migrations (version, name, checksum) VALUES ($1, $2, $3)',
            [mig.version, mig.name, checksum]
          );
          console.log(`b ${fmt(mig.version, mig.name)} - recorded as applied (bootstrap)`);
        }
        summary.bootstrapped += 1;
        continue;
      }

      if (STATUS_ONLY) {
        console.log(`+ ${fmt(mig.version, mig.name)} - pending`);
        summary.pending += 1;
        continue;
      }

      if (DRY_RUN) {
        console.log(`+ ${fmt(mig.version, mig.name)} - would apply`);
        summary.pending += 1;
        continue;
      }

      console.log(`+ ${fmt(mig.version, mig.name)} - applying...`);
      try {
        await runMigration(client, mig, sql, checksum);
        console.log(`  ok ${mig.version}`);
        summary.pending += 1;
      } catch (err) {
        console.error(`  FAILED ${mig.version}: ${err.message}`);
        if (err.position) console.error(`  position: ${err.position}`);
        exitCode = 1;
        break;
      }
    }

    console.log(
      `\nsummary: applied=${summary.applied} pending=${summary.pending} bootstrapped=${summary.bootstrapped} drift=${summary.drift}`
    );
  } finally {
    await client.end();
  }

  process.exit(exitCode);
}

main().catch((err) => {
  console.error('migration runner failed:', err.message);
  process.exit(1);
});
