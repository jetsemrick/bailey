#!/usr/bin/env bash
# Cloud Agent `start` script for Bailey.
#
# Runs on every container boot. Brings up the local backend that the app
# depends on, then hands off to the Vite dev server in the foreground:
#   1. start the Docker daemon (no systemd in these VMs)
#   2. start the local Supabase stack (images are pre-cached by install)
#   3. seed the schema + test account (idempotent)
#   4. exec the dev server so it stays attached as the tracked process
set -uo pipefail

export PATH="$HOME/.npm-global/bin:$PATH"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SB_EXCLUDE="studio,imgproxy,edge-runtime,logflare,vector,supavisor,pooler,mailpit"

log() { echo "[start] $*"; }

# Legacy iptables backend is required for Docker bridge networking here.
sudo update-alternatives --set iptables /usr/sbin/iptables-legacy >/dev/null 2>&1 || true
sudo update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy >/dev/null 2>&1 || true

# 1. Docker daemon.
if ! docker info >/dev/null 2>&1; then
  log "Starting Docker daemon"
  sudo dockerd --storage-driver=fuse-overlayfs >/tmp/dockerd.log 2>&1 &
  for _ in $(seq 1 60); do docker info >/dev/null 2>&1 && break; sleep 1; done
fi
sudo chmod 666 /var/run/docker.sock 2>/dev/null || true
docker info >/dev/null 2>&1 || { log "ERROR: Docker daemon unavailable (see /tmp/dockerd.log)"; }

# 2. Local Supabase stack (idempotent; no-op if already running).
cd "$REPO_ROOT"
log "Starting local Supabase"
supabase start -x "$SB_EXCLUDE" >/tmp/supabase-start.log 2>&1 \
  || log "WARN: supabase start returned non-zero (see /tmp/supabase-start.log)"

# 3. Seed schema + test account.
log "Seeding local database"
bash "$REPO_ROOT/scripts/seed-local-supabase.sh" || log "WARN: seeding reported an issue"

# 4. Dev server in the foreground.
log "Starting Vite dev server on http://localhost:3000"
cd "$REPO_ROOT/client"
exec bun run dev
