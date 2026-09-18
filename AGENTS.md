<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project: Arcade Vault

An online platform to play games and compete for the highest score (see README.md).

## Commands

- `npm run dev` — start the dev server (Turbopack, App Router)
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint (flat config, `eslint-config-next` core-web-vitals + typescript)

There is no test runner configured yet.

# Skills

Use always `/frontend-design` skill to design UI.

Use the `add-game` skill (`.claude/skills/add-game/`) to scaffold a new playable game end-to-end (catalog entry, cover art, ported engine component, play-page wiring, Supabase seed migration) via the spec-driven workflow — never add a game by hand.

# Agents

Use the `game-planner` agent (`.claude/agents/game-planner.md`) to decide which game should be added next — it analyzes the current catalog (`lib/games.ts`) and what's actually implemented (`references/implemented-games.md`) against category/mechanic gaps, and remembers its past suggestions in `references/game-suggestions.md` so it doesn't repeat itself. It only recommends; hand accepted suggestions to the `add-game` skill to implement.

## Architecture

- **App Router** under `app/`: `app/page.tsx` (home), `app/games/page.tsx` (catalog), `app/games/[id]/page.tsx` (game detail + `leaderboard-preview.tsx`), `app/games/[id]/play/page.tsx` (play page — per-`id` registry wiring real game components), `app/salon/page.tsx` (global leaderboard), `app/auth/page.tsx`, `app/about/page.tsx`, and API routes under `app/api/` (`contact`, `supabase-health`). Path alias `@/*` maps to the repo root (`tsconfig.json`).
- Styling via Tailwind CSS v4 (`@tailwindcss/postcss`), global styles in `app/globals.css` (includes per-game `.cover-<slug>` art rules).
- **Games catalog**: `lib/games.ts` defines the `Game` type and `GAMES` registry (id, title, category, cover, color, best/plays placeholders).
- **Game engines**: `components/games/` — one `<PascalName>Game.tsx` client component per game (See implemented games: references\implemented-games.md), each a ported game loop scoped inside a `useEffect`, exposing `restart()` via `forwardRef`/`useImperativeHandle`.
- **Supabase integration**: `lib/supabase/client.ts` and `server.ts` for client/server instances, `lib/supabase/scores.ts` for game-agnostic `getLeaderboard`/`getPlayerBest`/`insertScore` (keyed by `gameId`). The `games` table is a thin FK anchor seeded per-game via migration; the `scores` table stores leaderboard entries with RLS.
- `lib/useUser.ts` — auth/session hook.

## Spec Driven Design

This project follows spec-driven development using the `/spec` and `/spec-impl` workflow from https://github.com/Klerith/fernando-skills, installed via:

```bash
npx skills@latest add Klerith/fernando-skills
```

When implementing features, check for and follow this spec workflow rather than jumping straight to code.
