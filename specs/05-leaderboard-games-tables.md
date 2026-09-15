# 05 — Leaderboard and Games Tables

**State:** Approved
**Dependencies:** [03-supabase-connection.md](./03-supabase-connection.md) (Supabase client setup)
**Date:** 2026-09-14

**Objective:** Create `games` (thin FK anchor) and `scores` (leaderboard) tables in Supabase with RLS for anonymous inserts, then wire `/salon`, the game detail page's leaderboard preview, and the play page's save-score flow to read/write real data instead of `seededScores()`/`localStorage`.

## Scope

**In scope:**

- Supabase migration creating two tables:
  - `games` — thin FK anchor: `id` (text, PK, matches `lib/games.ts` ids), `title` (text), `category` (text). Seeded via the migration with the 10 current entries from `lib/games.ts` (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `rocas`, `asteroides`, `ranaria`, `duelo-pixel`, and any others currently in `GAMES`).
  - `scores` — `id` (uuid, PK, default `gen_random_uuid()`), `game_id` (text, FK → `games.id`), `player_name` (text, matches today's "3–10 uppercase initials" input), `score` (integer), `created_at` (timestamptz, default `now()`).
- RLS policies: public `SELECT` on both tables; public `INSERT` on `scores` only (no `UPDATE`/`DELETE` from the client on either table); no client `INSERT`/`UPDATE`/`DELETE` on `games` (it's seeded once via migration).
- `lib/supabase/scores.ts` (new) — typed query helpers:
  - `getLeaderboard(gameId: string, limit = 12)` — best run per player for a game, ordered by score desc (dedupe via `DISTINCT ON`/window function).
  - `getPlayerBest(gameId: string, playerName: string)` — a single player's best score + rank for a game (backs "TU MEJOR MARCA").
  - `insertScore({ gameId, playerName, score })` — inserts one row.
- Rewire `/salon` (`app/salon/page.tsx`) to fetch `getLeaderboard()` for the selected game tab instead of `seededScores()`; show an empty-state message ("SIN PUNTUACIONES AÚN — SÉ EL PRIMERO") in place of the podium/table when a game has zero rows; "TU MEJOR MARCA" section uses `getPlayerBest()` keyed on the current `useUser()` name, shown only when a user is set and has a saved score for that game.
- Rewire the game detail page's leaderboard preview (`app/games/[id]/page.tsx`) to use `getLeaderboard(id, 10)` instead of `seededScores()`, with the same empty-state message when there are no rows.
- Rewire the play page's save flow: `lib/useUser.ts`'s `saveScore()` is replaced by a call to `insertScore()` (Supabase), removing the `av_scores` localStorage write. The game-over modal's "GUARDAR PUNTUACIÓN" button becomes async (loading/error state) while the insert is in flight.
- Verify with Playwright MCP: run the migration, save a score from the play page, confirm it appears on `/salon` and the game detail page's leaderboard, confirm an empty game shows the empty-state message, confirm RLS blocks a direct client-side update/delete attempt.

**Not in scope:**

- Real authentication — `player_name` stays a free-text field typed at save time (or the `useUser()` localStorage name), not tied to `auth.users`/`auth.uid()`.
- Making `best`/`plays` on `/games` cards or the detail page hero live from `scores` — those stay the static values already in `lib/games.ts` (per prior decision).
- Mirroring `lib/games.ts`'s full catalog (short/long copy, cover, color) into the `games` table — it stays a thin FK anchor; `lib/games.ts` remains the source of truth for all catalog display data.
- Any UPDATE/DELETE UI for scores (editing or removing a saved score).
- Pagination beyond the current fixed row counts (12 on `/salon`, 10 on the detail page).
- Any change to `/games` filtering/search, `/auth`, or the Asteroids game engine itself.

## Data model

### `games` table

| Column     | Type   | Constraints                                     |
| ---------- | ------ | ----------------------------------------------- |
| `id`       | `text` | PRIMARY KEY (matches `lib/games.ts` `id`)       |
| `title`    | `text` | NOT NULL                                        |
| `category` | `text` | NOT NULL (`ARCADE`/`PUZZLE`/`SHOOTER`/`VERSUS`) |

Seeded once via the migration with the 10 current catalog entries. No client writes (RLS: SELECT only).

### `scores` table

| Column        | Type          | Constraints                                                   |
| ------------- | ------------- | ------------------------------------------------------------- |
| `id`          | `uuid`        | PRIMARY KEY, default `gen_random_uuid()`                      |
| `game_id`     | `text`        | NOT NULL, FOREIGN KEY → `games.id`                            |
| `player_name` | `text`        | NOT NULL, `CHECK (char_length(player_name) BETWEEN 1 AND 10)` |
| `score`       | `integer`     | NOT NULL, `CHECK (score >= 0)`                                |
| `created_at`  | `timestamptz` | NOT NULL, default `now()`                                     |

Index: `(game_id, score DESC)` to support the leaderboard query efficiently.

RLS: public `SELECT`; public `INSERT` (any anonymous client can insert a row with `game_id`/`player_name`/`score`); no `UPDATE`/`DELETE` policy (so those are denied by default).

### App-level types (`lib/supabase/scores.ts`)

```ts
export type ScoreRow = {
  rank: number;
  name: string;
  score: number;
  date: string; // formatted DD/MM/YYYY from created_at, matching today's display format
};

export async function getLeaderboard(
  gameId: string,
  limit?: number,
): Promise<ScoreRow[]>;
export async function getPlayerBest(
  gameId: string,
  playerName: string,
): Promise<ScoreRow | null>;
export async function insertScore(entry: {
  gameId: string;
  playerName: string;
  score: number;
}): Promise<void>;
```

`ScoreRow`'s shape matches the existing `lib/scores.ts` `ScoreRow` type so `/salon` and the detail page need minimal changes beyond swapping the data source. `lib/scores.ts`'s `seededScores()` and `PLAYERS` are deleted once nothing references them.

## Implementation plan

1. **Write the migration**: create `games` and `scores` tables (columns/constraints/index as above), enable RLS on both, add policies (`games`: public SELECT; `scores`: public SELECT + public INSERT), and seed `games` with the 10 current `lib/games.ts` entries (`id`, `title`, `category` only). Apply via Supabase MCP (`apply_migration`).

2. **Verify schema**: use `list_tables` to confirm both tables, columns, and RLS are as expected; use `get_advisors` (security) to confirm no RLS gaps are flagged.

3. **Build `lib/supabase/scores.ts`**: implement `getLeaderboard`, `getPlayerBest`, and `insertScore` using the existing `lib/supabase/client.ts` browser client (all three are called from client components). `getLeaderboard` uses a `DISTINCT ON (player_name)` (or equivalent) query ordered by `score DESC` to get each player's best run, then re-sorts/limits and assigns `rank` client-side; formats `created_at` into `DD/MM/YYYY`.

4. **Rewire `/salon`**: replace the `seededScores(tab.length * 23 + 7, 12)` call with `getLeaderboard(tab, 12)` (async, in a `useEffect`/state or a data hook), add a loading state while fetching, and an empty-state block ("SIN PUNTUACIONES AÚN — SÉ EL PRIMERO") replacing the podium/table when `rows.length === 0`. Replace the fabricated `youRank`/`youScore` with a `getPlayerBest(tab, user.name)` call, rendering the "TU MEJOR MARCA" block only when a result exists.

5. **Rewire the game detail page**: replace `seededScores(id.length * 17 + 3, 10)` in `app/games/[id]/page.tsx` with `getLeaderboard(id, 10)`, same loading/empty-state treatment.

6. **Rewire the save flow**: in `app/games/[id]/play/page.tsx`, replace the `saveScore({...})` call (from `lib/useUser.ts`) with `insertScore({ gameId: game.id, playerName: name, score })`; make the "GUARDAR PUNTUACIÓN" button handler async with a small loading/disabled state and a basic error message on failure (e.g. network/RLS rejection), keeping `setSaved(true)` only on success.

7. **Remove dead code**: delete `saveScore()` from `lib/useUser.ts` and `seededScores()`/`PLAYERS` from `lib/scores.ts` once no callers remain; delete `lib/scores.ts` entirely if nothing else imports it.

8. **Verify with Playwright MCP**: play Asteroids (or any game) to game over, save a score with a test name, confirm it immediately appears on `/salon` (correct tab) and on the game's detail page leaderboard with the right rank/date; confirm a game with zero scores shows the empty-state message; confirm "TU MEJOR MARCA" appears for a logged-in user after saving and matches their saved score; attempt a direct `update`/`delete` via the Supabase client console and confirm RLS rejects it.

9. **Run `npm run lint`** to confirm no lint errors from the new/changed files.

## Acceptance criteria

- [ ] A Supabase migration exists creating `games` (`id`, `title`, `category`) and `scores` (`id`, `game_id`, `player_name`, `score`, `created_at`) with the constraints and index described in the data model.
- [ ] RLS is enabled on both tables: public `SELECT` on both, public `INSERT` on `scores` only; no `UPDATE`/`DELETE` policy exists on either table (verified via `get_advisors` and a manual rejected-write check).
- [ ] `games` is seeded with all 10 current `lib/games.ts` catalog entries (`id`/`title`/`category`), verified via `list_tables`/a `SELECT`.
- [ ] `lib/supabase/scores.ts` exports working `getLeaderboard`, `getPlayerBest`, and `insertScore` functions against the real Supabase project.
- [ ] `/salon` renders real leaderboard rows per game tab from `getLeaderboard()`, no `seededScores()` call remains.
- [ ] `/salon` shows the empty-state message for a game with zero saved scores instead of a podium/table.
- [ ] `/salon`'s "TU MEJOR MARCA" section reflects the current user's real best score for the selected game (via `getPlayerBest`), and is hidden when there's no user or no saved score for them.
- [ ] The game detail page's leaderboard preview (`app/games/[id]/page.tsx`) renders real rows from `getLeaderboard()`, with the same empty-state treatment.
- [ ] Saving a score on the play page's game-over modal inserts a real row into `scores` via `insertScore()`; the row appears on `/salon` and the detail page leaderboard without a page reload being required beyond normal navigation.
- [ ] `lib/useUser.ts`'s old `saveScore()` (localStorage `av_scores`) and `lib/scores.ts`'s `seededScores()`/`PLAYERS` are removed with no remaining references.
- [ ] `npm run lint` passes with no new errors.
- [ ] Playwright MCP confirms the full save → appear-on-leaderboard flow end-to-end, the empty-state message, the "TU MEJOR MARCA" section, and that a direct client-side update/delete attempt on `scores` is rejected by RLS.

## Decisions taken and discarded

- **Schema + full wiring in one spec, not schema-only** — user's explicit choice; avoids a schema that sits unused for a full spec cycle before anything reads/writes it.
- **`games` table as a thin FK anchor, not a full catalog mirror** — user's explicit choice; `lib/games.ts` stays the single source of truth for all display copy/cover/color, avoiding drift between two places that describe the same game.
- **`games` seeded from `lib/games.ts` at migration time, not left empty** — user's explicit choice; guarantees `scores.game_id`'s FK has valid targets for all 10 current games before any score is ever saved.
- **Anonymous inserts, no real auth required** — user's explicit choice; matches today's "type your initials" UX exactly, and building real auth is out of scope (already deferred once in [03-supabase-connection.md](./03-supabase-connection.md)).
- **Insert-only, every run kept as its own row** — user's explicit choice; simplest write path (no upsert/max logic), matches today's `saveScore()` which just appends.
- **Leaderboard query dedupes to each player's best run** — user's explicit choice; keeps the "hall of fame" feel (one name, one entry) even though every run is stored, via `DISTINCT ON`/window function in the query rather than at write time.
- **Empty-state message instead of falling back to fake seeded data** — user's explicit choice; once this ships, no code path shows fabricated scores as if they were real, even though most games will start with zero real rows.
- **`best`/`plays` on cards/detail hero stay static (`lib/games.ts`), not computed from `scores`** — user's explicit choice; keeps this spec focused on the leaderboard/save flow, avoids touching `/games` card rendering.
- **"TU MEJOR MARCA" identified by matching `player_name` to the current `useUser()` name** — user's explicit choice; same non-unique, non-secure identity model the app already uses (`useUser()` is just a localStorage display name), not a regression since no real auth exists yet.
- **No UPDATE/DELETE RLS policy on `scores`** — user's explicit choice; scores are meant to be a permanent record, and omitting the policies is the simplest way to enforce that (default-deny).

## Identified risks

- **`player_name` is unauthenticated and unenforced-unique** — anyone can save a score under any name (including impersonating another player's display name), and "TU MEJOR MARCA" can show a wrong/misleading result if two players pick the same name. Accepted as consistent with today's localStorage-based identity; a real fix requires auth (out of scope).
- **Public `INSERT` with no rate limiting** — a client could script repeated inserts to flood a game's leaderboard with fake high scores; no server-side validation beyond the `score >= 0` / `player_name` length checks and RLS. Acceptable for this project's scope; abuse mitigation (rate limits, CAPTCHA, server-side validation route) would be a follow-up spec if it becomes a real problem.
- **`games` table can drift from `lib/games.ts`** if a future game is added to the catalog without a corresponding migration/seed row — new game's `scores` inserts would fail the FK constraint. Needs to be remembered as a manual step whenever a new game is added until a future spec automates it.
- **Leaderboard dedup query (`DISTINCT ON`/window function) runs on every `/salon` tab switch and detail page load** — fine at current expected data volumes, but has no caching/pagination; would need optimization if score volume grows significantly.
