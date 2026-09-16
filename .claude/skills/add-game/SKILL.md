---
name: add-game
description: Scaffold a new playable game for Arcade Vault (catalog entry, ported engine component, cover art, play-page wiring, Supabase seed migration) by running the project's spec-driven workflow inline, pre-seeded with proven conventions so the same questions never get re-asked.
disable-model-invocation: true
argument-hint: '<game slug/title> [reference folder under references/started-games, or "original"]'
---

# /add-game — Scaffold a new Arcade Vault game

This skill turns a game idea — a raw reference under `references/started-games/`, another external source, or an original concept — into a fully integrated Arcade Vault game: catalog entry, cover art, a ported engine component, play-page wiring, and a Supabase seed migration for the leaderboard.

**You never write application code here — only a spec file.** This skill's job is to (1) gather the few inputs that are genuinely game-specific, (2) run the project's own spec-driven methodology **inline**, pre-loaded with the reusable conventions below so the drafting phase doesn't rediscover them from scratch, and (3) remind the user to run `/spec-impl` once the resulting spec is approved. Spec authorship happens inside this skill's own Step 4; implementation stays inside `/spec-impl`. Never skip straight to code.

## Important: do not invoke `/spec` or `/spec-impl` as tools

Both `.claude/skills/spec/SKILL.md` and `.claude/skills/spec-impl/SKILL.md` are declared with `disable-model-invocation: true`. That means the agent **cannot** call them through the Skill tool — only a human typing `/spec` or `/spec-impl` themselves can. Attempting to invoke either from inside this skill will fail.

Instead: **Read** `.claude/skills/spec/SKILL.md` and `.claude/skills/spec/template.md` with the Read tool (plain file reads, not a skill call) and follow their Phase 1–4 methodology yourself, directly, inline, in Step 4 below. Reading a file is unrestricted; invoking a `disable-model-invocation: true` skill is not.

## Why this skill exists

Arcade Vault already has a proven recipe for adding a real, playable, leaderboard-backed game — it was worked out in `specs/04-asteroids-game.md` and `specs/05-leaderboard-games-tables.md` (both `Implemented`) when the `asteroides` game was built. That recipe has sharp edges that are easy to forget when redoing it from memory (a missing Supabase seed migration silently breaks score-saving; copy-pasted cover art looks like a duplicate game; a second game re-introducing an ad-hoc boolean instead of a registry). This skill exists to carry that recipe forward every time a new game is added, instead of re-deriving it — or worse, skipping the spec step and going straight to code.

Since `specs/05` already created and seeded the `games`/`scores` tables with RLS, a _new_ game does **not** need a second "leaderboard tables" spec the way `asteroides` did. It needs one **combined** spec — catalog entry + cover art + ported engine component + play-page wiring + a seed-row migration into the existing `games` table — structured like spec 04, with spec 05's seeding step folded in as a single implementation-plan item instead of a whole separate spec.

## Command flow

Your replies must be in the same language as the initial prompt (Spanish in, Spanish out; English in, English out) — same rule `/spec` follows.

### Step 1 — Gather game-specific inputs

If `$ARGUMENTS` doesn't already answer these, ask the user in one blocking question block:

1. **Game slug/title.** What should the catalog `id`/`title` be?
2. **Category.** One of `ARCADE` / `PUZZLE` / `SHOOTER` / `VERSUS` (see `lib/games.ts`'s `Game.cat`).
3. **Source material.** One of:
   - An unused folder under `references/started-games/` (check the folder listing at spec-drafting time rather than trusting a stale list — `02-asteroids` is already ported as `asteroides`).
   - A different external source the user provides.
   - "Build from scratch" (original concept, no reference file to port).
4. **Scope.** The standard combined shape described below (catalog + cover + engine + play-page wiring + seed migration, matching spec 04 plus a folded-in seed step), or a narrower slice the user wants split into its own follow-up spec?

Do **not** re-ask the generic Data/Integration/Persistence/UX-states question categories that `/spec`'s own Phase 2 would normally cover — the conventions cheat-sheet in Step 3 already answers them for this class of feature. Only ask follow-up questions about things the cheat-sheet can't resolve (e.g. unusual mechanics in the chosen source material, a genuinely new interaction pattern).

### Step 2 — Check current state of the play page before assuming anything

Read `app/games/[id]/play/page.tsx` now, at skill-run time. The conventions below describe the state as of the `asteroides` port (a single `isAsteroids`-style boolean branch); if a second real game has been added since, this file may already be a per-`id` registry/lookup. Reflect whatever you actually find when drafting the Implementation plan in Step 4 — don't describe stale code.

### Step 3 — Conventions cheat-sheet

This is what makes the resulting spec correct on the first try. Fold every one of these into the spec you draft in Step 4 — don't let the drafting phase rediscover them from scratch:

- **Catalog entry** (`lib/games.ts`): a new `GAMES` entry matching the existing `Game` type — `id, title, short, long, cat, cover: "cover-<slug>", color, best, plays`. `best`/`plays` are placeholder seed values; no other game in the catalog has real aggregates either.
- **Cover art** (`app/globals.css`): a new `.cover-<slug>` rule block (+ pseudo-elements as needed), placed near the existing `.cover-asteroides`/`.cover-rocas` rules. It must be visually distinct from every existing game's cover — never copy-paste another game's rules wholesale.
- **Engine component** (`components/games/<PascalName>Game.tsx`): `"use client"`; port the reference's game loop almost 1:1 into a factory scoped inside a `useEffect` on mount, closing over local (non-module-level) state so remounting never collides with a previous instance. `forwardRef` + `useImperativeHandle` exposing at least `restart()`. Props follow the `AsteroidsGameProps` pattern: `paused`, `onScoreChange`, `onGameOver(finalScore)`, plus whichever other stats this game tracks (e.g. `onLivesChange`, `onLevelChange`). Strip any in-canvas HUD text and game-over overlay drawing from the ported code — the page's existing `.player-hud` and game-over modal already cover both, so drawing them twice is a bug, not a feature. Keyboard/input listeners are added in the effect and removed on cleanup, with `preventDefault()` applied only while the component is mounted, so other routes are never affected. Use `components/games/AsteroidsGame.tsx` as the canonical example to read before writing the new one.
- **Play-page wiring** (`app/games/[id]/play/page.tsx`): per Step 2's live check — if it's still a single boolean branch (`isAsteroids`-style) between the real component and the fake `.game-arena` placeholder, the spec's implementation plan must call for evolving it into a scalable per-`id` lookup/registry of real game components rather than stacking a second boolean. If it's already a registry, the plan just adds an entry to it.
- **Supabase seeding**: `lib/supabase/scores.ts`'s `getLeaderboard`/`getPlayerBest`/`insertScore` are already game-agnostic (keyed by a `gameId` string) — no code changes needed there for a new game. The `games` table (a thin FK anchor: `id, title, category`) and its RLS already exist per spec 05 — no new table/policy work. What's still required every time: the new game's **row** must be inserted into `games` via a new migration (`mcp__supabase__apply_migration`, a single `INSERT`, not a `CREATE TABLE`) before any score can be saved, or `scores.game_id`'s foreign key will reject every insert. The spec's implementation plan must include this seed-row migration as its own explicit step — this exact gap was flagged as an unautomated manual risk in spec 05, and it's the single easiest thing to forget.
- **Verification**: a Playwright MCP flow mirroring specs 04/05's acceptance criteria — catalog card renders and is filterable by its category chip; detail page renders (hero, leaderboard preview, empty-state message when there are zero scores yet); play page responds to input, the outer HUD (score/lives/level) updates live from real gameplay, game-over opens the existing modal with the real final score, saving a score inserts into Supabase and appears on both `/salon` and the detail page, `PAUSA`/`REANUDAR`/`FIN`/`SALIR`/`JUGAR DE NUEVO` all behave correctly, and remounting (navigate away and back) leaves no leaked `requestAnimationFrame` loop or duplicate keyboard listeners; finally, `npm run lint` passes.

### Step 4 — Run the spec methodology inline

Read `.claude/skills/spec/SKILL.md` and `.claude/skills/spec/template.md` in full (Read tool). Then execute that same process yourself, directly:

- **Phase 1 (context)** is already done — Steps 1–3 above are this skill's version of it, plus you already have `specs/04-asteroids-game.md` and `specs/05-leaderboard-games-tables.md` as the two most recent relevant precedents. Cite both by path throughout drafting.
- **Phase 2 (clarifying questions)** — skip re-asking anything the cheat-sheet already answers; only ask what Step 1 left open.
- **Phase 3 (section-by-section drafting)** — draft the sections in `template.md`'s order (Header, Scope, Data model, Implementation plan, Acceptance criteria, Decisions taken and discarded, Identified risks), one at a time, showing each in markdown and waiting for the user's confirmation before moving to the next — exactly as `/spec` does. The **Scope** section explicitly lists what's carried over unchanged from spec 05 (no new tables/RLS) versus what's new (the seed row). The **Implementation plan** must include the seed-migration step as its own numbered item, and must reflect Step 2's live check of the play page rather than assuming it's still a single boolean.
- **Phase 4 (save)** — determine the next sequential number by listing `specs/` (do not hardcode a number; check at run time), generate a slug from the objective, confirm the filename with the user, write `specs/NN-slug.md` with state `Draft`. Leave `specs/.spec-config.yml` untouched — it already exists.

Follow `/spec`'s "Hard rules" and "Common mistakes to avoid" sections as read from its `SKILL.md` (never generate the whole spec in one shot, never assume unconfirmed names, verifiable acceptance criteria only, etc.) — they apply here unchanged.

### Step 5 — Remind about `/spec-impl`

Once the user tells you the resulting spec's `Status` has been changed to `Approved`, tell them to run `/spec-impl NN-slug` themselves to implement it. Do not attempt to invoke `/spec-impl` from inside this skill (same `disable-model-invocation` restriction as `/spec` — see above), and do not implement anything yourself here.

## Hard rules

- **Never write application code.** No edits to `lib/games.ts`, `app/globals.css`, any `components/games/*.tsx` file, `app/games/[id]/play/page.tsx`, or any Supabase migration — all of that happens only inside `/spec-impl`'s existing step-by-step, diff-reviewed implementation flow.
- **Never invoke `/spec` or `/spec-impl` via the Skill tool.** Both are `disable-model-invocation: true`; read their files and run the logic inline instead, as described in Step 4.
- **Never skip the spec step.** Even if the user wants to move fast, this skill's entire value is making sure the conventions cheat-sheet above reaches the spec before code exists. Going straight to code reproduces the exact mistakes (forgotten seed migration, copy-pasted cover art, a second ad-hoc boolean in the play page) this skill exists to prevent.
- **Never mark a spec `Approved` on the user's behalf** — that stays the user's call, same as in `/spec`.
- **Stop after Step 4's save and Step 5's reminder.** Don't propose implementing anything further.

## Arguments

If invoked as `/add-game asteroides-2 references/started-games/03-tetris`, treat the first token as the slug/title suggestion and the second as the source folder, but still confirm both with the user in Step 1 rather than assuming. If invoked with no arguments, start Step 1 from scratch.
