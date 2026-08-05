#!/usr/bin/env bash
# Start the Docker daemon in this VM (no systemd here) and make its socket
# usable by the non-root `ubuntu` user. Idempotent: returns success if the
# daemon is already reachable without sudo.
#
# The daemon is started with `--group ubuntu` (so dockerd owns the socket by a
# group the ubuntu user belongs to) and, belt-and-suspenders, the socket is also
# chmod'd 0666. Readiness is gated on an UNPRIVILEGED `docker info`, i.e. exactly
# what the Supabase CLI needs. Exits non-zero if that never succeeds.
set -uo pipefail

log() { echo "[docker] $*"; }

DOCKER_SOCK_GROUP="${DOCKER_SOCK_GROUP:-ubuntu}"

relax_socket() {
  sudo chgrp "$DOCKER_SOCK_GROUP" /var/run/docker.sock 2>/dev/null || true
  sudo chmod 666 /var/run/docker.sock 2>/dev/null || true
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

log "starting dockerd (storage-driver=fuse-overlayfs, socket group=$DOCKER_SOCK_GROUP)"
sudo dockerd --group "$DOCKER_SOCK_GROUP" --storage-driver=fuse-overlayfs >/tmp/dockerd.log 2>&1 &

# Wait for the daemon to come up (root can always reach it), then record pid.
for _ in $(seq 1 120); do
  sudo docker info >/dev/null 2>&1 && break
  sleep 1
done
if ! sudo docker info >/dev/null 2>&1; then
  log "ERROR: dockerd did not come up; tail of /tmp/dockerd.log:"
  tail -n 40 /tmp/dockerd.log || true
  exit 1
fi
pgrep -x dockerd | head -1 > /tmp/cursor-dockerd.pid

# Confirm the UNPRIVILEGED user can reach the socket (what the app needs),
# reapplying permissions each iteration in case dockerd reset them on startup.
for _ in $(seq 1 30); do
  relax_socket
  docker info >/dev/null 2>&1 && { log "daemon ready"; exit 0; }
  sleep 1
done

log "ERROR: docker socket not reachable by unprivileged user"
ls -la /var/run/docker.sock 2>&1 || true
exit 1
