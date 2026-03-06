# Bailey

## Cursor Cloud specific instructions

### Services

Bailey is a client-only SPA (React + Vite + Tailwind) with Supabase as the sole backend (cloud-hosted). There are no Docker containers or self-hosted services.

- **Dev server**: `bun run dev` from repo root (Vite on http://localhost:3000)
- **Backend**: Supabase project "Bailey" (project ref `tnugrtqtokppkxjdcsii`, us-east-2)

### Environment

- `client/.env` must contain `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` pointing to the Supabase project. Copy from `client/.env.example`.
- `VITE_SIGNUP_ACCESS_CODE` controls signup gating. Without it, the access code field still appears but any value is accepted when the env var is empty.
- Bun v1.3.1 is the declared package manager. Install deps with `bun install` in `client/`.

### Lint / Build / Dev

- **Type check (lint)**: `bunx tsc --noEmit` in `client/`
- **Build**: `bun run build` from repo root
- **Dev**: `bun run dev` from repo root
- No ESLint or Prettier is configured. TypeScript strict mode (`noUnusedLocals`, `noUnusedParameters`) is the primary lint gate.
- No test framework is configured yet.

### Database

- Schema lives in `client/src/db/schema.sql`; migrations in `client/src/db/migrations/` as numbered SQL files.
- The Supabase project already has the full schema + all 8 migrations applied.
- Supabase email verification is enabled. To test signup flow without real email, confirm the user via SQL: `UPDATE auth.users SET email_confirmed_at = now() WHERE email = '...'`.

### Gotchas

- The root `package.json` postinstall runs `npm install --prefix client`, but the lockfile is `client/bun.lock`. Use `bun install` in `client/` directly for correct lockfile resolution.
- Vite auto-restarts when `client/.env` changes; no manual restart needed after editing env vars.
