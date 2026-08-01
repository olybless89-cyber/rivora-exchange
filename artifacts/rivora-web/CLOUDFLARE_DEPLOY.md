# ─────────────────────────────────────────────────────────────
# CLOUDFLARE PAGES — Build & deployment settings
# ─────────────────────────────────────────────────────────────
# Build command:   pnpm --filter rivora-web build
# Output dir:      artifacts/rivora-web/dist
# Root dir:        /   (monorepo root)
# Node version:    20
#
# Environment variables to set in Cloudflare Pages dashboard:
# ─────────────────────────────────────────────────────────────

# Supabase
VITE_SUPABASE_URL=https://glnpskstjttwhwlwsljt.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>

# Per-site tenant slug (set DIFFERENT value per Cloudflare Pages project)
# Cloudflare will resolve by custom domain automatically in production.
# Only needed if you don't assign a custom domain.
VITE_TENANT_SLUG=rivora

# ─────────────────────────────────────────────────────────────
# DEPLOYING 100+ SITES
# ─────────────────────────────────────────────────────────────
# Option A (Recommended): One Cloudflare Pages project per site
#   - Add custom domain (e.g. goldvest.com) in CF Pages → Custom domains
#   - Tenant is resolved by domain automatically — no VITE_TENANT_SLUG needed
#   - All sites share the SAME git repo + SAME build
#   - Only VITE_TENANT_SLUG differs (or use custom domain)
#
# Option B: Subdomains under one wildcard domain
#   - *.rivora.app → one CF Pages project
#   - Tenant resolved from subdomain
#
# Workflow to deploy site #2 (goldvest):
#   1. cf pages create goldvest  (or clone existing project in CF dashboard)
#   2. Connect same GitHub repo
#   3. Set VITE_TENANT_SLUG=goldvest (or add custom domain goldvest.com)
#   4. In Super Admin panel, create tenant with slug=goldvest
#   5. Done — no new code, no new server
# ─────────────────────────────────────────────────────────────
