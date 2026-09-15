# 03 — Supabase Connection

**State:** Implemented
**Dependencies:** None (independent of specs 01/02)
**Date:** 2026-09-11

**Objective:** Wire up the Supabase client connection (browser + server, via `@supabase/ssr`) to the existing project `xtxxtmluzdqppcampwnm`, with env vars and a health-check route proving the app can reach the real backend, without creating any database tables or building auth/scores features yet.

## Scope

**In scope:**

- Install `@supabase/supabase-js` and `@supabase/ssr` as dependencies.
- `lib/supabase/client.ts` — browser client via `createBrowserClient` from `@supabase/ssr`, reading `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `lib/supabase/server.ts` — server client via `createServerClient` from `@supabase/ssr`, cookie-aware (using `next/headers`' `cookies()`), for use in Server Components and Route Handlers.
- `.env.local.example` — add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (legacy anon/JWT key) alongside the existing `SUPABASE_DB_PASSWORD`.
- `.env.local` — populate with the real project URL (`https://xtxxtmluzdqppcampwnm.supabase.co`) and the real anon key, so the app runs locally against the actual Supabase project (already gitignored).
- `app/api/supabase-health/route.ts` (`GET`) — uses the server client to call `supabase.auth.getSession()` (or equivalent lightweight call that needs no tables) and returns `{ ok: true }` on success or `{ ok: false, error: string }` with 500 on failure.
- Verify with Playwright MCP: hit `/api/supabase-health` and confirm it returns `{ ok: true }` against the real project.

**Not in scope:**

- Creating any database tables, schemas, or RLS policies.
- Real authentication (sign up/sign in, session UI, replacing `lib/useUser.ts`) — deferred to a future spec.
- Real score persistence / leaderboard — deferred to a future spec.
- OAuth providers (Google/GitHub) configuration in the Supabase dashboard.
- Any change to `app/auth/page.tsx`, `lib/useUser.ts`, `lib/scores.ts`, `/salon`, or `/games`.

## Data model

No new persisted data types or database schema are introduced (explicitly out of scope — see Scope). The only new shape is the health-check route's response contract, kept local to `app/api/supabase-health/route.ts`:

```ts
type HealthResponse = { ok: true } | { ok: false; error: string };
```

## Implementation plan

1. **Install dependencies**: `npm install @supabase/supabase-js @supabase/ssr`.

2. **Update `.env.local.example`**: add

   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   ```

   below the existing `SUPABASE_DB_PASSWORD` line.

3. **Populate `.env.local`** with the real values for `NEXT_PUBLIC_SUPABASE_URL` (`https://xtxxtmluzdqppcampwnm.supabase.co`) and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the legacy anon JWT key from the linked project), so the app can reach the real backend locally.

4. **Build `lib/supabase/client.ts`**: export a `createClient()` function using `createBrowserClient` from `@supabase/ssr`, reading the two `NEXT_PUBLIC_*` env vars.

5. **Build `lib/supabase/server.ts`**: export an async `createClient()` function using `createServerClient` from `@supabase/ssr`, wired to `next/headers`' `cookies()` for `get`/`set`/`remove`, for use in Server Components and Route Handlers.

6. **Build the health-check route** `app/api/supabase-health/route.ts` (`GET`): call `lib/supabase/server.ts`'s `createClient()`, call `supabase.auth.getSession()`, return `{ ok: true }` (200) if it resolves without throwing, or `{ ok: false, error: String(err) }` (500) if it throws. This needs no tables since `auth.getSession()` only touches Supabase Auth's session store.

7. **Verify with Playwright MCP**: start `npm run dev`, navigate to `/api/supabase-health` (or fetch it via the page), confirm the JSON response is `{ ok: true }`, and check the browser/server console for unrelated errors.

8. **Run `npm run lint`** to confirm no lint errors from the new files.

## Acceptance criteria

- [ ] `@supabase/supabase-js` and `@supabase/ssr` are listed in `package.json` dependencies.
- [ ] `.env.local.example` documents `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` alongside the existing `SUPABASE_DB_PASSWORD`.
- [ ] `.env.local` contains real values for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` pointing at project `xtxxtmluzdqppcampwnm`.
- [ ] `lib/supabase/client.ts` exports a working browser client via `@supabase/ssr`'s `createBrowserClient`.
- [ ] `lib/supabase/server.ts` exports a working cookie-aware server client via `@supabase/ssr`'s `createServerClient`.
- [ ] `GET /api/supabase-health` returns `{ ok: true }` with a 200 status when run against the real Supabase project, with no tables required.
- [ ] `npm run lint` passes with no new errors.
- [ ] Playwright MCP confirms `/api/supabase-health` returns `{ ok: true }` and no unrelated console errors appear.

## Decisions taken and discarded

- **Split into a connection-only spec, deferring auth and scores** — user's explicit choice after the scope-split question raised too many combined domains (auth + scores + schema + RLS); this spec is pure plumbing so future auth/scores specs (03 dependency) don't need to redo client setup.
- **`@supabase/ssr` over bare `@supabase/supabase-js`** — user's explicit choice; sets up the cookie-aware browser/server client split that Next.js App Router auth needs later, even though no auth is built in this spec.
- **No table creation** — user's explicit choice ("I just need database connection, no table creation at this time"); verified via `list_tables` that `public` schema is currently empty, and this spec leaves it that way.
- **Health check via `supabase.auth.getSession()`**, not a database query — avoids needing any table to exist while still proving the server client can talk to the real Supabase Auth service over the network.
- **Legacy anon JWT key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) over the newer `sb_publishable_...` key** — user's explicit choice; matches naming conventions most Supabase/Next.js examples and docs currently use.
- **Real project (`xtxxtmluzdqppcampwnm`), not a fresh one** — user's explicit choice; already linked in `.mcp.json` from a prior commit.

## Identified risks

- **`NEXT_PUBLIC_*` anon key is exposed to the browser by design** — this is expected/safe for Supabase's anon key (protected by RLS on real tables later), but worth noting since it's visible in client bundle output.
- **No schema exists yet** — future auth/scores specs will need to design the `profiles`/`scores` tables and RLS policies from scratch; this spec deliberately leaves that undone.
