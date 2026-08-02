#!/usr/bin/env bash
# Render build script — runs from the monorepo root.
# pnpm is pre-installed at /usr/bin/pnpm on Render's Node 24 image.
# Do NOT call corepack or npm install -g — /usr/bin and /usr/lib are read-only.
set -euo pipefail

echo "[render-build] Node $(node -v) | pnpm $(pnpm -v)"

# Install all workspace dependencies.
# --ignore-scripts skips the root preinstall guard (which checks
# npm_config_user_agent and exits 1 for non-pnpm callers). pnpm itself
# sets that variable correctly when it runs lifecycle scripts, but calling
# pnpm from a bash script in Render's environment sometimes does not inject
# it — skipping scripts avoids the guard entirely; the guard's only purpose
# is to prevent developers from accidentally running npm/yarn locally.
pnpm install --frozen-lockfile --ignore-scripts

echo "[render-build] tsx binary: $(ls node_modules/.bin/tsx 2>/dev/null && echo FOUND || echo MISSING)"
