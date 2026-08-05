#!/usr/bin/env bash
# Seed the local Supabase stack for Bailey development.
#
# Idempotent: applies client/src/db/schema.sql (which drops + recreates the
# public tables and backfills profiles from auth.users) and ensures a known
# test account exists. Safe to run on every boot.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCHEMA_SQL="$REPO_ROOT/client/src/db/schema.sql"

# Well-known Supabase local development keys (public, non-secret defaults that
# ship with `supabase start`; identical on every machine).
SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:54321}"
ANON_KEY="${ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0}"
SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU}"

TEST_EMAIL="${BAILEY_TEST_EMAIL:-testuser@bailey.com}"
TEST_PASSWORD="${BAILEY_TEST_PASSWORD:-password123}"

log() { echo "[seed] $*"; }

DB_CONTAINER="$(docker ps --filter 'name=supabase_db' --format '{{.Names}}' | head -1)"
if [ -z "$DB_CONTAINER" ]; then
  log "ERROR: no running supabase_db container found"
  exit 1
fi

# Wait for Postgres to accept connections.
for _ in $(seq 1 60); do
  if docker exec "$DB_CONTAINER" pg_isready -U postgres -d postgres >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

log "Applying schema.sql to $DB_CONTAINER"
# schema.sql begins with DROP statements that intentionally no-op on a fresh DB,
# so we do not use ON_ERROR_STOP here; failures in real DDL still surface below.
docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres < "$SCHEMA_SQL" > /tmp/bailey-seed-schema.log 2>&1
if grep -iE 'ERROR' /tmp/bailey-seed-schema.log | grep -viE 'relation "profiles" does not exist|does not exist, skipping' >/dev/null; then
  log "ERROR while applying schema.sql:"
  grep -iE 'ERROR' /tmp/bailey-seed-schema.log | grep -viE 'does not exist, skipping' || true
  exit 1
fi
log "schema.sql applied"

# Ensure the test account exists (auto-confirmed). A 200/201 means created; a
# 422 means it already exists, both of which are fine.
log "Ensuring test user $TEST_EMAIL"
code="$(curl -s -o /tmp/bailey-seed-user.json -w '%{http_code}' \
  -X POST "$SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"email_confirm\":true}")"
case "$code" in
  200|201) log "test user created" ;;
  422) log "test user already exists" ;;
  *) log "WARN: unexpected status $code creating test user"; cat /tmp/bailey-seed-user.json 2>/dev/null || true ;;
esac

# Re-run schema backfill target: make sure a profile row exists for the user
# (handle_new_user fires on signup; the schema.sql backfill covers pre-existing
# users, so this is only a safety net when the user predated the tables).
docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres >/dev/null 2>&1 <<SQL
INSERT INTO public.profiles (id, email, role)
SELECT u.id, u.email, 'User'::user_role
FROM auth.users u
WHERE u.email IS NOT NULL
ON CONFLICT (id) DO NOTHING;
SQL

log "done"
