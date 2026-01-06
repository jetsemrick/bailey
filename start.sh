#!/usr/bin/env bash
set -euo pipefail

mode="${1:-dev}"

cd "$(dirname "$0")"

if ! command -v bun >/dev/null 2>&1; then
  echo "bun is required. Install it from https://bun.sh/"
  exit 1
fi

# Reproducible install (requires bun.lock)
bun install --frozen-lockfile

# Ensure Prisma Client exists before starting the server workspace
bun --cwd=server run prisma:generate

case "$mode" in
  dev)
    exec bun run dev
    ;;
  client)
    exec bun --cwd=client run dev
    ;;
  server)
    exec bun --cwd=server run dev
    ;;
  *)
    echo "Usage: ./start.sh [dev|client|server]"
    exit 2
    ;;
esac


