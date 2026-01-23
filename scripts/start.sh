#!/usr/bin/env bash
set -euo pipefail

mode="${1:-dev}"

cd "$(dirname "$0")/.."

if ! command -v bun >/dev/null 2>&1; then
  echo "bun is required. Install it from https://bun.sh/"
  exit 1
fi

# Reproducible install (requires bun.lock)
bun install --frozen-lockfile

# Ensure Prisma Client exists before starting the backend workspace
bun --cwd=backend run prisma:generate

case "$mode" in
  dev)
    exec bun run dev
    ;;
  frontend)
    exec bun --cwd=frontend run dev
    ;;
  backend)
    exec bun --cwd=backend run dev
    ;;
  *)
    echo "Usage: ./start.sh [dev|frontend|backend]"
    exit 2
    ;;
esac


