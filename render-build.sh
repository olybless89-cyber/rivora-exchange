#!/usr/bin/env bash
# Render build script — runs from the monorepo root.
# Uses corepack (built into Node 22+) to activate the pnpm version declared
# in package.json#packageManager without needing a global npm install.
set -euo pipefail

echo "[render-build] Node $(node -v) | npm $(npm -v)"

# Activate pnpm via corepack — writes the shim into the local PATH, no
# /usr/lib write needed, no EROFS error.
corepack enable pnpm
corepack prepare pnpm@9.15.4 --activate

echo "[render-build] pnpm $(pnpm -v)"

# Install all workspace dependencies
pnpm install --frozen-lockfile

echo "[render-build] Done — tsx binary: $(ls node_modules/.bin/tsx 2>/dev/null && echo OK || echo MISSING)"
