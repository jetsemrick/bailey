# Bailey - Agent Instructions

## Cursor Cloud specific instructions

### Services

Bailey is a single-service frontend SPA (React + Vite) backed by Supabase (cloud BaaS). There is no custom backend server to run.

| Service | Command | Notes |
|---------|---------|-------|
| Dev server | `bun run dev` (from repo root) | Vite on http://localhost:3000 |
| Build | `bun run build` | Runs `tsc` then `vite build` |
| Type check | `cd client && bunx tsc --noEmit` | Strict mode; serves as lint |

### Key caveats

- **No ESLint or test framework**: The project has no ESLint config and no test runner (vitest/jest). TypeScript strict mode (`bunx tsc --noEmit`) is the only static analysis check available.
- **Supabase secrets required**: The dev server needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables. These are written to `client/.env` at setup time from injected secrets. Without them the app will render but all API calls fail.
- **Auth-gated app**: All routes require Supabase Auth. To test beyond the login/signup pages, a valid test account (email + password) for the connected Supabase project is required.
- **Package manager**: Bun v1.3.1 (installed via `npm install -g bun@1.3.1`). The lockfile is `client/bun.lock`. Run `bun install` from `client/` (not the repo root) to install dependencies using the bun lockfile; running from root triggers the npm-based `postinstall` hook instead.
- **No git hooks or pre-commit checks** are configured.
