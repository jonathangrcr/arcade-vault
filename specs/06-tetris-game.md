# 06 — Tetris Game

> **Status:** Implemented
> **Depends on:** SPEC 04 (asteroides-game — patrón de referencia para el port), SPEC 05 (leaderboard-games-tables — tabla `games` que hay que actualizar)
> **Date:** 2026-09-15
> **Objective:** Reemplazar la entrada placeholder "CAÍDA" del catálogo por "TETRIS", un port jugable en canvas de `references/started-games/03-tetris/game.js` (tablero 10×20, 7 piezas, rotación con wall kicks, ghost piece, next-piece preview, hard/soft drop, niveles), cableado al HUD y modal de fin de partida ya existentes.

## Scope

**In scope:**

- Rename the existing catalog entry in `lib/games.ts` from `id: "caida"` to `id: "tetris"`, `title: "CAÍDA"` → `title: "TETRIS"`, updating `short`/`long` copy to describe the real port (confirmed in the Data model section), keeping `cat: "PUZZLE"` and `color: "magenta"` unchanged, and updating `cover: "cover-tetro"` → `cover: "cover-tetris"`.
- Rename the corresponding CSS rule block in `app/globals.css` from `.cover-tetro` to `.cover-tetris` (selector rename only — the existing block already reads as Tetris-appropriate art, so no visual redesign is required unless the rename reveals it needs adjustment).
- A new client component `components/games/TetrisGame.tsx` that ports `references/started-games/03-tetris/game.js` almost 1:1: 10×20 board, 7 standard pieces, `rotateCW` + wall-kick rotation, ghost piece, hard drop / soft drop, line clearing, classic scoring table (`[0,100,300,500,800]` × level), and level-up every 10 lines. The component renders its own small "next piece" preview canvas alongside the main board inside `.crt-screen` (kept as a real gameplay aid, not outer-HUD duplication) — this is the one addition beyond the `AsteroidsGame.tsx` pattern, everything else follows it: `"use client"`, factory scoped inside a mount-time `useEffect`, no module-level state, `forwardRef` + `useImperativeHandle` exposing `restart()`, and canvas draw calls strip any in-canvas score/lines/level text (the page's `.player-hud` already shows those).
- Props follow the `AsteroidsGameProps` pattern: `paused`, `onScoreChange(score)`, `onLevelChange(level)`, `onGameOver(finalScore)`. There is no `onLivesChange` — Tetris plays with a single fixed life (no gradual decrement); the outer HUD's "Vidas" stat shows a static `1` for this game until game over, driven by the play page's registry entry, not a callback.
- Keyboard input scoped to the component's mount lifetime: `ArrowLeft/ArrowRight` move, `ArrowUp` or `X` rotate, `ArrowDown` soft drop, `Space` hard drop. The reference's own `P` (pause) key binding is **dropped** — pausing is driven exclusively by the page's existing `paused` prop/PAUSA button, matching the `AsteroidsGame` convention. Listeners added on mount, removed on unmount, `preventDefault()` applied only while mounted.
- Evolve `app/games/[id]/play/page.tsx`'s current single `isAsteroids` boolean branch into a small per-`id` lookup/registry of real game components (`asteroides` → `AsteroidsGame`, `tetris` → `TetrisGame`), so a third game later adds one registry entry instead of a second boolean. The registry also carries an optional `fixedLives` value (used by `tetris`, set to `1`) for games that don't report lives via a callback.
- A new Supabase migration (`mcp__supabase__apply_migration`) that deletes the stale `id = 'caida'` row from `games` and inserts the new `id = 'tetris'` row (`title`, `category`), so `scores.game_id`'s FK accepts inserts for the renamed game. No score rows exist yet for `caida` (never wired to a real play page), so the delete is safe.
- Verify with Playwright MCP per the acceptance criteria below.

**Out of scope (for future specs):**

- Touch/on-screen controls — keyboard only, matching the reference 1:1 (same decision already made for `asteroides`).
- Sound effects — the reference has none, no game on the site has audio yet.
- Any change to `/games` filtering/search, `/salon`'s query logic, `/auth`, or the `scores` table schema/RLS (all already correct and game-agnostic per spec 05).
- Any other placeholder game (`bloque-buster`, `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`) — their fake `.game-arena` stays exactly as-is.
- Redesigning `.cover-tetro`'s visuals beyond the selector rename — a fresh cover-art pass is a follow-up if the renamed art turns out to look wrong next to the real game.
- Making the outer HUD's "Vidas"/stat schema generically configurable per game beyond the `fixedLives` value needed here — a broader HUD-schema refactor is deferred until a third game needs something HUD-shaped that doesn't fit lives/level either.

## Data model

### Catalog entry (`lib/games.ts`)

The `Game` type is unchanged. The existing `"caida"` entry is edited in place:

```ts
{
  id: "tetris",
  title: "TETRIS",
  short: "Encaja las piezas antes de que el techo te aplaste.",
  long: "El clásico atemporal: piezas geométricas de siete formas caen desde la oscuridad. Rótalas con wall-kicks, usa la pieza fantasma para apuntar el aterrizaje y limpia líneas antes de que la pila te alcance. La velocidad no perdona: sube cada 10 líneas.",
  cat: "PUZZLE",
  cover: "cover-tetris",
  color: "magenta",
  best: 184220,   // kept from "caida" as a placeholder seed value, see decisions
  plays: "31.8K", // kept from "caida" as a placeholder seed value, see decisions
}
```

### Component contract (`components/games/TetrisGame.tsx`, local — not a shared `lib/` type)

```ts
type TetrisGameProps = {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};

type TetrisGameHandle = {
  restart: () => void;
};
```

Mirrors `AsteroidsGameProps`/`AsteroidsGameHandle` minus lives (Tetris reports none via callback) plus no extra fields — the next-piece preview is drawn internally by the component onto its own small canvas, it is not exposed as a prop/callback.

### Play-page game registry (`app/games/[id]/play/page.tsx`)

Replaces the single `isAsteroids` boolean with a small per-`id` lookup so a third game is one entry, not a second boolean:

```ts
const GAME_COMPONENTS: Record<
  string,
  { Component: typeof AsteroidsGame | typeof TetrisGame; fixedLives?: number }
> = {
  asteroides: { Component: AsteroidsGame },
  tetris: { Component: TetrisGame, fixedLives: 1 },
};
```

`fixedLives`, when present, makes the page display that static number in "Vidas" instead of wiring an `onLivesChange` callback (which `TetrisGame` doesn't expose, since it has none to report). All games not present in `GAME_COMPONENTS` keep today's fake `.game-arena` placeholder and fake score ticker unchanged.

### Supabase migration

A single `DELETE` + `INSERT` against the existing `games` table (schema from spec 05, unchanged):

```sql
delete from games where id = 'caida';
insert into games (id, title, category) values ('tetris', 'TETRIS', 'PUZZLE');
```

## Implementation plan

1. **Rename the catalog entry**: edit the existing `"caida"` object in `lib/games.ts` to the confirmed `"tetris"` shape (id, title, short, long, cover) from the Data model section, leaving `cat`/`color`/`best`/`plays` as noted. System stays functional here — `/games` and `/games/tetris` show the real card/detail page (still using the fake `.game-arena` on `/play` until step 4), and `/games/caida` now 404s (expected, no game referenced it beyond the catalog).

2. **Rename the cover-art selector**: in `app/globals.css`, rename `.cover-tetro` (and any pseudo-element rules under it) to `.cover-tetris`, no other changes. Confirm visually in the browser that the card still renders correctly under the new class name.

3. **Port the game engine**: create `components/games/TetrisGame.tsx` (`"use client"`), following `components/games/AsteroidsGame.tsx`'s structure. Move `game.js`'s board matrix, piece shapes, `rotateCW`/`tryRotate`, `collide`, the `loop`/`dropAccum` timing, `clearLines`, scoring table, and `ghostY` into a factory function created inside a mount-time `useEffect`, closing over two canvas refs (main board + next-piece preview) instead of `document.getElementById`, and over local (non-module-level) state so remounts never collide. Strip the reference's in-canvas `SCORE`/`LINES`/`LEVEL` text drawing and its `PAUSA`/`GAME OVER` overlay (the page's `.player-hud` and modal already cover both) — keep the next-piece preview canvas since it's gameplay information, not a HUD duplicate. Drop the reference's `P` keydown handler entirely; wire `ArrowLeft/ArrowRight/ArrowUp/X/ArrowDown/Space` with `preventDefault()`, added in the effect and removed on cleanup. Call `onScoreChange`/`onLevelChange` whenever those values change inside the loop, and `onGameOver(score)` from the reference's `endGame()` path. Expose `restart()` via `useImperativeHandle` that re-runs the equivalent of `init()`. Respect `paused` by skipping the drop/lock logic (still `draw()`s) each `requestAnimationFrame` tick, and always cancel the RAF handle on unmount.

4. **Build the play-page registry and wire Tetris in**: in `app/games/[id]/play/page.tsx`, replace the `isAsteroids` boolean with the `GAME_COMPONENTS` lookup from the Data model section. Render `GAME_COMPONENTS[game.id]?.Component` when present (passing `paused`, `onScoreChange={setScore}`, `onLevelChange={setLevel}`, `onGameOver={() => setOver(true)}`, plus `onLivesChange={setLives}` only when the entry has no `fixedLives`). When `fixedLives` is set, force the outer `lives` state to that value (shown in "Vidas") instead of wiring a callback. Falls back to today's fake `.game-arena` + `setInterval` ticker for ids not in the registry. Wire `PAUSA`/`REANUDAR` to the existing `paused` toggle, `FIN` to set `over(true)` with the current live score, and `JUGAR DE NUEVO` to call the mounted component's `restart()` in addition to the existing state resets.

5. **Write and apply the Supabase migration**: `delete from games where id = 'caida'; insert into games (id, title, category) values ('tetris', 'TETRIS', 'PUZZLE');` via `mcp__supabase__apply_migration`. Verify with `list_tables`/a `select` that `caida` is gone and `tetris` is present.

6. **Verify with Playwright MCP**: start `npm run dev`, navigate to `/games`, confirm the "TETRIS" card renders under the `PUZZLE` filter chip (and `"CAÍDA"` no longer appears anywhere). Open `/games/tetris`, confirm the detail page renders (hero, leaderboard preview showing the empty-state message, since the old `caida` row/scores are gone). Click "JUGAR AHORA", confirm the board and next-piece preview render, pieces respond to all keys, ghost piece shows the landing position, line clears score correctly and the outer HUD's Score/Nivel update live, confirm "Vidas" shows a static `1`. Play to a top-out and confirm the existing game-over modal opens with the real final score; save a score and confirm it appears on `/salon` and the detail page leaderboard (validating the migration's FK fix). Confirm `PAUSA`/`REANUDAR`/`FIN`/`SALIR`/`JUGAR DE NUEVO` all behave correctly, and that navigating away and back leaves no leaked `requestAnimationFrame` loop or duplicate keyboard listeners (console/network check). Re-verify `/games/asteroides/play` still works unchanged (registry regression check).

7. **Run `npm run lint`** to confirm no lint errors from the new/changed files.

## Acceptance criteria

- [ ] `lib/games.ts` no longer contains an entry with `id: "caida"`; it contains a `"tetris"` entry with the confirmed title/copy/`cat: "PUZZLE"`/`color: "magenta"`/`cover: "cover-tetris"`.
- [ ] `/games` shows a "TETRIS" card with `.cover-tetris` art, filterable under the `PUZZLE` chip; no "CAÍDA" card exists anywhere.
- [ ] `/games/tetris` renders the detail page (hero, tags, leaderboard) with no runtime errors; the leaderboard preview shows the empty-state message before any score is saved.
- [ ] `/games/tetris/play` renders a working canvas game: all 7 pieces spawn and rotate with wall kicks, ghost piece shows the projected landing row, soft drop and hard drop both work, a completed row is cleared and shifts the stack down, the next-piece preview canvas updates after each spawn.
- [ ] The outer HUD's Score/Nivel values update live from real gameplay while playing Tetris; "Vidas" shows a static `1` throughout play; no score/lines/level text is drawn a second time inside the canvas.
- [ ] Topping out (a spawn that immediately collides) opens the existing game-over modal with the real final score; saving a score calls the existing `insertScore` flow and the row appears on both `/salon` and `/games/tetris`'s leaderboard.
- [ ] `PAUSA` freezes the canvas game (no piece movement) and `REANUDAR` resumes it; pressing `P` on the keyboard does nothing (no in-canvas pause binding); `FIN` ends the game immediately with the current score; `JUGAR DE NUEVO` fully resets the board, next-piece preview, score, level, and the "Vidas" display back to `1`.
- [ ] Navigating away (`SALIR`) and back into `/games/tetris/play` starts a fresh game with no leftover `requestAnimationFrame` loop or duplicate keyboard listeners (verified via console check, no warnings).
- [ ] `/games/asteroides/play` still behaves exactly as before (registry refactor regression check): canvas renders, HUD updates including a real decrementing "Vidas", game-over/save/restart flow unchanged.
- [ ] All other game ids (`bloque-buster`, `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`) still show the original fake `.game-arena` placeholder and fake score ticker, unchanged.
- [ ] The Supabase `games` table has no `id = 'caida'` row and has an `id = 'tetris'` row (verified via `list_tables`/a `select`).
- [ ] `npm run lint` passes with no new errors.
- [ ] Playwright MCP confirms the full flow above end-to-end with no unrelated console errors.

## Decisions taken and discarded

- **Rename/replace the `"caida"` entry instead of adding a new `"tetris"` entry alongside it** — user's explicit choice, opposite of the `asteroides`/`rocas` precedent; justified because `"caida"`'s existing copy already describes Tetris near-verbatim, unlike `"rocas"` vs `"asteroides"` where the user wanted both to coexist. Requires a Supabase migration step this pattern didn't otherwise need (delete the stale `caida` row, insert `tetris`).
- **Keep `cat: "PUZZLE"` and `color: "magenta"` unchanged from `"caida"`** — user's explicit choice; no reason to change identity attributes that already fit, this is a rename/upgrade, not a new game.
- **Rename `.cover-tetro` → `.cover-tetris` with no visual redesign** — since this replaces the same catalog slot rather than adding a new one, the existing cover art is already thematically correct; a full redesign is deferred unless it visibly looks wrong post-rename (out of scope, see Scope section).
- **`best`/`plays` seed values kept from `"caida"`** (`184220` / `"31.8K"`) — same reasoning as `asteroides` reusing `"rocas"`'s placeholder: no game in the catalog has real aggregate stats, so carrying the old placeholder forward is no regression.
- **Ported as imperative canvas code, not React state** — same reasoning as `asteroides`: preserves the proven game loop, avoids re-render overhead for a fast per-frame simulation. Factory scoped per mount, no module-level globals.
- **In-canvas score/lines/level/pause/game-over text stripped, but the next-piece preview kept** — the former duplicates the outer `.player-hud`/modal; the latter is genuine gameplay information with no equivalent slot in the outer HUD, so it stays inside the component's own second canvas.
- **Reference's `P` pause key dropped, pausing driven only by the page's `paused` prop** — matches the `AsteroidsGame` convention exactly; avoids two competing pause triggers (keyboard vs. button) that could desync.
- **Tetris shows a static `1` in the outer "Vidas" stat instead of hiding it** — user's explicit correction; Tetris does have a life (the single run ends on top-out), so "Vidas" stays visible and meaningful across all games rather than becoming conditionally hidden per game.
- **Play page evolves to a per-`id` `GAME_COMPONENTS` registry instead of a second `isAsteroids`-style boolean** — required per this skill's own convention once a second real game is added; keeps a third future game a one-line registry addition.
- **Keyboard-only controls, no touch, no sound** — same reasoning as `asteroides`: matches the reference 1:1, keeps this spec scoped to the port itself.

## Identified risks

- **Deleting the `id = 'caida'` row from `games` is a destructive migration step** — safe only because `"caida"` was never wired to a real play page (no `scores` rows can reference it). Must be double-checked (`select count(*) from scores where game_id = 'caida'`) immediately before applying the migration, in case any manual/test inserts happened since spec 05.
- **Two canvases in one component (`board` + `next-piece preview`)** — doubles the surface for a leaked `requestAnimationFrame` or a stale ref if either canvas isn't properly torn down on unmount; needs explicit verification (step 6) that navigating away and back doesn't duplicate loops for either canvas.
- **`GAME_COMPONENTS` registry refactor touches the same `app/games/[id]/play/page.tsx` logic asteroides currently depends on** — regression risk for `asteroides` while generalizing the boolean branch; mitigated by re-verifying `/games/asteroides/play` end-to-end in step 6 before considering this spec done.
- **Global `keydown`/`keyup` listeners with `preventDefault()`** on `ArrowLeft/Right/Up/Down/X/Space` will block page scrolling while Tetris is mounted — same accepted tradeoff as `asteroides`, scoped tightly to the component's mount/unmount.
- **`.crt-screen`'s aspect ratio assumes the canvas's logical resolution matches** — the reference's board is 300×600 (10×20 at `BLOCK=30`), a narrower/taller aspect than `asteroides`'s 800×600; needs visual confirmation in step 6 that the board doesn't look stretched or letterboxed oddly inside `.crt-screen`, with the next-piece preview canvas sized to fit alongside it without overflowing the frame.
