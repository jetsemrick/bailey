---
name: migration-smoke-test
description: End-to-end smoke test for Bailey after applying Supabase migrations or making schema-affecting changes. Use after running migrations against any environment (especially production), before merging schema PRs, or when validating that PostgREST schema cache + UI are in sync. Exercises the four flows that have repeatedly broken on stale schemas (timer preset, CX flow tab, keyboard macros, admin RPC) plus a baseline tournament/round/flow create path.
---

# Migration smoke test

## When to apply

Run this skill any time the production schema changes, including:

- After invoking `apply_migration` via the Supabase MCP, or merging a PR that triggers `.github/workflows/db-migrate.yml`
- After manually running SQL in the Supabase SQL Editor
- Before approving a PR that adds or modifies anything in `client/src/db/migrations/`
- When debugging a "PGRST204" / "PGRST205" / "column not found" report from a user

It is intentionally narrow: it covers the historically-broken paths plus a baseline create flow, not full feature coverage. Pair with `bun run test` for unit coverage.

## Pre-flight

1. Confirm migrations are applied. Read-only check via PostgREST + anon key (no auth needed):

   ```bash
   for col in "tournaments?select=timer_preset" "flow_tabs?select=tab_kind" \
              "keyboard_macros?select=id" "admin_emails?select=email"; do
     curl -s -o /dev/null -w "%{http_code} $col\n" \
       -H "apikey: $VITE_SUPABASE_ANON_KEY" \
       -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
       "$VITE_SUPABASE_URL/rest/v1/$col&limit=0"
   done
   ```

   All four must return `200`. A `404` (`PGRST205`) means the table is missing; a `400` (`42703`) means the column is missing — apply the corresponding migration first.

2. Configure the dev server to point at the target Supabase project:

   ```bash
   cat > client/.env.local <<EOF
   VITE_SUPABASE_URL=$VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
   EOF
   ```

3. Start the dev server in a tmux session (so it survives the test agent):

   ```bash
   tmux -f /exec-daemon/tmux.portal.conf has-session -t =bailey-dev 2>/dev/null \
     || tmux -f /exec-daemon/tmux.portal.conf new-session -d -s bailey-dev -c /workspace/client
   tmux -f /exec-daemon/tmux.portal.conf send-keys -t bailey-dev:0.0 'bun run dev' C-m
   sleep 5
   curl -fsS -o /dev/null http://localhost:3000/ && echo "dev server up"
   ```

## Test credentials

Use the existing test account (do **not** sign up — signups consume real auth records):

- Email: `testuser@bailey.com`
- Password: `password123`

If a test needs an admin path, check `public.profiles WHERE role = 'Admin'` for current admins via the Supabase MCP.

## Walkthrough script

Pass this verbatim to the `computerUse` subagent. Wrap the agent call in a `RecordScreen` START/SAVE pair so the demo video lands in `/opt/cursor/artifacts/`.

```text
Open Chrome at http://localhost:3000 and DevTools (Console + Network).
Log in with testuser@bailey.com / password123.

For each step take a labeled screenshot:

1. SCREENSHOT_HOMEPAGE — tournaments dashboard after login.
2. Create tournament "Migration Smoke Test <timestamp>". In the form:
   - Verify the Debate timer selector shows BOTH "High school" and "College".
     SCREENSHOT_TIMER_PRESET.
   - Pick "College". Save.
3. Open the new tournament, add round 1. SCREENSHOT_ROUND_PAGE.
4. Add a CX flow tab. SCREENSHOT_CX_TAB.
5. Open the Add Flow Tab modal again — the CX option must be disabled or
   blocked. SCREENSHOT_CX_LIMIT.
6. Open Settings → keyboard macros, change one shortcut to a unique value
   (e.g. Shift+K for "Next Flow Sheet"), save, F5 reload, reopen Settings,
   confirm the new value is still there. SCREENSHOT_MACROS_SAVED.
7. Navigate back to the tournaments list, reopen the test tournament,
   confirm timer preset is still "College". SCREENSHOT_TIMER_PRESET_PERSISTED.
8. Delete the test tournament. SCREENSHOT_FINAL.

If any step shows a red error banner or PGRST204/PGRST205/"table not
found" in the console, STOP and report the error with a screenshot.
Report PASS/FAIL for each of: timer_preset, CX insert, CX uniqueness,
keyboard_macros save+reload.
```

## Pass criteria

All six criteria must hold:

| # | Check | Migration |
|---|-------|-----------|
| 1 | Login + dashboard load without console errors | – |
| 2 | "Debate timer" shows High school / College, "College" persists | 014 |
| 3 | CX flow tab inserts and renders | 015 + 016 trigger |
| 4 | Second CX tab is rejected / disabled | 015 unique partial index |
| 5 | Keyboard shortcut change persists across F5 | 013 |
| 6 | No PGRST204 / PGRST205 / "table not found" / "column not found" | all |

## Artifacts and PR walkthrough

Copy the relevant screenshots and the demo video into `/opt/cursor/artifacts/`:

```bash
cp /tmp/computer-use/<hash>.webp /opt/cursor/artifacts/timer_preset_selector.webp
# ...for each labeled screenshot
```

Include them in the PR body under a `## Walkthrough` section using `<video>` and `<img>` tags with absolute `/opt/cursor/artifacts/...` paths. Verify the demo with the `videoReview` subagent before posting.

## Cleanup

- Leave the dev server running unless instructed otherwise — follow-up testing is faster from the same state.
- Delete any `MIGRATION_TEST_*` rows you created. Cascade is enabled, so deleting the tournament also drops its rounds, flow_tabs, flow_cells, flow_analytics, and round_analytics.
- Do not delete the `testuser@bailey.com` auth record.

## Related

- `scripts/apply-supabase-migrations.mjs` — the migration runner this skill validates.
- `.cursor/skills/database-migrations/SKILL.md` — when to add a new migration in the first place.
- `.github/workflows/db-migrate.yml` — applies migrations on push to `main`.
