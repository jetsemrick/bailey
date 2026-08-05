#!/usr/bin/env bash
# Start the Docker daemon in this VM (no systemd here) and make its socket
# usable by the non-root `ubuntu` user. Idempotent: returns success if the
# daemon is already reachable without sudo. Exits non-zero otherwise.
#
# The daemon is started with `--group ubuntu` so dockerd itself owns the socket
# by a group the ubuntu user already belongs to (avoids a chmod race where
# dockerd resets socket permissions after we relax them). Readiness is gated on
# an UNPRIVILEGED `docker info`, i.e. exactly what the Supabase CLI needs.
set -uo pipefail

log() { echo "[docker] $*"; }

# Group dockerd should assign to the socket; ubuntu is a member of its own
# primary group, so this grants access without a login shell / group refresh.
DOCKER_SOCK_GROUP="${DOCKER_SOCK_GROUP:-ubuntu}"

relax_socket() {
  sudo chgrp "$DOCKER_SOCK_GROUP" /var/run/docker.sock 2>/dev/null || true
  sudo chmod 660 /var/run/docker.sock 2>/dev/null || true
}

# Already usable without sudo? Nothing to do.
if docker info >/dev/null 2>&1; then
  log "daemon already running"
  exit 0
fi

# No usable daemon: clear stale runtime files that can block a fresh start.
# NOTE: only /var/run state is removed; /var/lib/docker (images) is preserved.
for pid in $(pgrep -x dockerd); do sudo kill "$pid" >/dev/null 2>&1 || true; done
sleep 1
sudo rm -f /var/run/docker.pid 2>/dev/null || true

start_dockerd() {
  local driver="$1"
  log "starting dockerd (storage-driver=$driver, socket group=$DOCKER_SOCK_GROUP)"
  sudo dockerd --group "$DOCKER_SOCK_GROUP" --storage-driver="$driver" >/tmp/dockerd.log 2>&1 &
  # Wait for the daemon to be up (root can always reach it).
  for _ in $(seq 1 120); do
    sudo docker info >/dev/null 2>&1 && break
    sleep 1
  done
  sudo docker info >/dev/null 2>&1 || return 1
  pgrep -x dockerd | head -1 > /tmp/cursor-dockerd.pid
  # Now confirm the UNPRIVILEGED user can reach the socket (what the app needs).
  for _ in $(seq 1 30); do
    relax_socket
    docker info >/dev/null 2>&1 && return 0
    sleep 1
  done
  return 1
}

if start_dockerd "fuse-overlayfs"; then
  log "daemon ready"
  exit 0
fi

log "WARN: dockerd not ready with fuse-overlayfs; retrying with vfs"
for pid in $(pgrep -x dockerd); do sudo kill "$pid" >/dev/null 2>&1 || true; done
sleep 2
sudo rm -f /var/run/docker.pid 2>/dev/null || true
if start_dockerd "vfs"; then
  log "daemon ready"
  exit 0
fi

log "ERROR: dockerd failed to become usable; tail of /tmp/dockerd.log:"
tail -n 40 /tmp/dockerd.log || true
exit 1
