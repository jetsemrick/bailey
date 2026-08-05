#!/usr/bin/env bash
# Cloud Agent `install` script for Bailey.
#
# Idempotent, one-time setup that is baked into the environment snapshot:
#   - system packages (Docker + helpers), configured for a nested VM
#   - pinned Bun toolchain and project dependencies
#   - pinned Supabase CLI
#   - local client env file
#   - warmed Supabase container images (so per-boot `supabase start` is fast)
#
# It must terminate and leave no long-running processes; the Docker daemon and
# the Supabase stack are (re)started per boot by scripts/cloud-start.sh.
set -euo pipefail

BUN_VERSION="1.3.1"
SUPABASE_CLI_VERSION="2.111.0"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NPM_PREFIX="$HOME/.npm-global"

log() { echo "[install] $*"; }

# ---------------------------------------------------------------------------
# 1. System packages: Docker, compose, and nested-container networking helpers.
# ---------------------------------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  log "Installing Docker and helpers via apt"
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    docker.io docker-compose-v2 fuse-overlayfs uidmap iptables
else
  log "Docker already installed"
fi

# Docker's bridge networking (container <-> container) does not work with the
# nft iptables backend inside these VMs; the legacy backend is required.
sudo update-alternatives --set iptables /usr/sbin/iptables-legacy >/dev/null 2>&1 || true
sudo update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy >/dev/null 2>&1 || true

# ---------------------------------------------------------------------------
# 2. Bun toolchain (pinned) + project dependencies.
# ---------------------------------------------------------------------------
export PATH="$NPM_PREFIX/bin:$PATH"
if ! command -v bun >/dev/null 2>&1 || [ "$(bun --version 2>/dev/null)" != "$BUN_VERSION" ]; then
  log "Installing Bun $BUN_VERSION"
  mkdir -p "$NPM_PREFIX"
  npm install --prefix "$NPM_PREFIX" -g "bun@$BUN_VERSION"
fi
if ! grep -q 'npm-global/bin' "$HOME/.bashrc" 2>/dev/null; then
  echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> "$HOME/.bashrc"
fi

log "Installing project dependencies (bun install)"
cd "$REPO_ROOT"
bun install --frozen-lockfile

# ---------------------------------------------------------------------------
# 3. Supabase CLI (pinned).
# ---------------------------------------------------------------------------
if ! command -v supabase >/dev/null 2>&1 || [ "$(supabase --version 2>/dev/null)" != "$SUPABASE_CLI_VERSION" ]; then
  log "Installing Supabase CLI $SUPABASE_CLI_VERSION"
  tmp="$(mktemp -d)"
  curl -fsSL -o "$tmp/supabase.tar.gz" \
    "https://github.com/supabase/cli/releases/download/v${SUPABASE_CLI_VERSION}/supabase_linux_amd64.tar.gz"
  tar -xzf "$tmp/supabase.tar.gz" -C "$tmp" supabase
  sudo install -m 0755 "$tmp/supabase" /usr/local/bin/supabase
  rm -rf "$tmp"
fi

# ---------------------------------------------------------------------------
# 4. Local client environment file (points the dev server at local Supabase).
# ---------------------------------------------------------------------------
if [ ! -f "$REPO_ROOT/client/.env.local" ]; then
  log "Writing client/.env.local"
  cat > "$REPO_ROOT/client/.env.local" <<'ENV'
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
ENV
fi

# ---------------------------------------------------------------------------
# 5. Warm the Supabase container images into the snapshot (best effort).
#    Boot the daemon, pull/start the stack once, then tear it down so no
#    process survives install. Only the downloaded images remain on disk.
# ---------------------------------------------------------------------------
SB_EXCLUDE="studio,imgproxy,edge-runtime,logflare,vector,supavisor,pooler,mailpit"
if command -v docker >/dev/null 2>&1; then
  log "Warming Supabase images"
  if ! docker info >/dev/null 2>&1; then
    sudo dockerd --storage-driver=fuse-overlayfs >/tmp/dockerd-install.log 2>&1 &
    DOCKERD_PID=$!
    for _ in $(seq 1 60); do docker info >/dev/null 2>&1 && break; sleep 1; done
  fi
  sudo chmod 666 /var/run/docker.sock 2>/dev/null || true
  if docker info >/dev/null 2>&1; then
    cd "$REPO_ROOT"
    supabase start -x "$SB_EXCLUDE" >/tmp/supabase-warm.log 2>&1 \
      && log "Supabase started (images cached)" \
      || log "WARN: Supabase warm start failed; images will be pulled on first boot (see /tmp/supabase-warm.log)"
    supabase stop --no-backup >/dev/null 2>&1 || true
  else
    log "WARN: Docker daemon did not come up during install; skipping image warm-up"
  fi
  # Ensure no daemon lingers past install.
  if [ -n "${DOCKERD_PID:-}" ]; then
    sudo kill "$DOCKERD_PID" >/dev/null 2>&1 || true
    wait "$DOCKERD_PID" 2>/dev/null || true
  fi
fi

log "install complete"
