#!/usr/bin/env bash
# Start the Docker daemon in this VM (no systemd here) and make its socket
# usable by the non-root user. Idempotent: returns success if a daemon is
# already running. Exits non-zero if the daemon cannot be brought up.
#
# Readiness is checked with `sudo docker info` (root) because the socket is
# created root-owned; we then relax its permissions for the `ubuntu` user.
set -uo pipefail

log() { echo "[docker] $*"; }

ensure_socket_perms() { sudo chmod 666 /var/run/docker.sock 2>/dev/null || true; }

if sudo docker info >/dev/null 2>&1; then
  log "daemon already running"
  ensure_socket_perms
  exit 0
fi

# No daemon running: clear stale runtime files that can block a fresh start.
# NOTE: only /var/run state is removed; /var/lib/docker (images) is preserved.
sudo rm -f /var/run/docker.pid 2>/dev/null || true

start_dockerd() {
  local driver="$1"
  log "starting dockerd (storage-driver=$driver)"
  sudo dockerd --storage-driver="$driver" >/tmp/dockerd.log 2>&1 &
  for _ in $(seq 1 120); do
    sudo docker info >/dev/null 2>&1 && { pgrep -x dockerd | head -1 > /tmp/cursor-dockerd.pid; return 0; }
    sleep 1
  done
  return 1
}

if start_dockerd "fuse-overlayfs"; then
  :
else
  log "WARN: dockerd did not come up with fuse-overlayfs; retrying with vfs"
  # Kill the stuck attempt, if any, before retrying with a different driver.
  for pid in $(pgrep -x dockerd); do sudo kill "$pid" >/dev/null 2>&1 || true; done
  sleep 2
  sudo rm -f /var/run/docker.pid 2>/dev/null || true
  if ! start_dockerd "vfs"; then
    log "ERROR: dockerd failed to start; tail of /tmp/dockerd.log:"
    tail -n 40 /tmp/dockerd.log || true
    exit 1
  fi
fi

ensure_socket_perms
log "daemon ready"
