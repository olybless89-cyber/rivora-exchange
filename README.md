# Rivora Exchange

Mobile-first investment platform for Nigerian users (NGN), rebuilt from the
Veeka-NGN concept under the RIVORA EXCHANGE brand.

## Stack

Same pattern as stockinvestmenttrading: pnpm workspace monorepo, Vite +
React frontend, Express backend, Postgres via Drizzle ORM, orval-generated
API client (Zod validation server-side, React Query hooks client-side).

- `lib/db` -- Drizzle schema + Postgres client
- `lib/api-spec` -- `openapi.yaml`, source of truth for the API surface;
  `pnpm -C lib/api-spec run codegen` regenerates `lib/api-zod` and
  `lib/api-client-react` from it
- `lib/api-zod` -- generated Zod schemas (server-side validation)
- `lib/api-client-react` -- generated React Query hooks + fetch client
- `artifacts/api-server` -- Express backend
- `artifacts/rivora-web` -- Vite + React frontend

## First-time setup (run these yourself -- this sandbox has no network to
## your registry/database)

```bash
pnpm install

# Create the tables from lib/db/src/schema.ts against your real Postgres DB
DATABASE_URL="postgresql://..." pnpm -C lib/db exec drizzle-kit push

# Generate lib/api-zod and lib/api-client-react from openapi.yaml
pnpm -C lib/api-spec run codegen

# Typecheck everything
pnpm run typecheck

# Run the API server locally
cp artifacts/api-server/.env.example artifacts/api-server/.env
# edit artifacts/api-server/.env with your real DATABASE_URL / JWT_SECRET
pnpm -C artifacts/api-server run dev

# Run the frontend locally
pnpm -C artifacts/rivora-web run dev
```

On first boot, the API server auto-creates an admin account
(`+2348000000001` / `Rivora2025!`, forced password change on first login)
and seeds the 10 RIVO-LV investment plans if the table is empty.

## Deploying

Same pattern as stockinvestmenttrading: Render (API) + Vercel (frontend).
See `artifacts/rivora-web/vercel.json` for the SPA rewrite rule, and
`artifacts/api-server/src/app.ts` for the CORS allowlist -- update the
placeholder domain there once you have a real one.
