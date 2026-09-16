# 08 — Snake Game

> **Status:** Implemented
> **Depends on:** SPEC 04 (asteroides-game — reference pattern for the port), SPEC 06 (tetris-game — precedent for replacing a placeholder + the `GAME_COMPONENTS` registry), SPEC 07 (arkanoid-game — precedent for a catalog id rename + Supabase migration)
> **Date:** 2026-09-16
> **Objective:** Replace the placeholder catalog entry "SERPENTINA" with "SNAKE" (`id: "serpentina"` → `id: "snake"`), a from-scratch classic Snake engine (grid movement, growing tail, self-collision) rendered with neon CRT blocks and random fruit sprites from `references/source-assets/snake-assets`, wired into the existing HUD and game-over/save-score modal.

## Scope

**In:**

- Rename the existing catalog entry in `lib/games.ts` from `id: "serpentina"` to `id: "snake"`, `title: "SERPENTINA"` → `title: "SNAKE"`, updating `short`/`long` copy to describe the real game (confirmed in the Data model section), keeping `cat: "ARCADE"` and `color: "green"` unchanged, and updating `cover: "cover-snake"` → `cover: "cover-snake-2"` (new selector, since the existing `.cover-snake` art is being replaced, not just renamed).
- A new CSS rule block in `app/globals.css`, `.cover-snake-2` (+ pseudo-elements as needed), placed near the existing `.cover-snake`/`.cover-rana` rules, visually distinct from every other cover (including the old `.cover-snake`, which stops being referenced by any catalog entry once this ships).
- Copy `references/source-assets/snake-assets/fruits.png` into `public/sprites/` (new folder) so it's servable at runtime; the sprite-coordinate data from `references/source-assets/snake-assets/sprites.js` is ported into a typed TS object co-located with the new component (not loaded as a raw `<script>`).
- A new client component `components/games/SnakeGame.tsx`, built from scratch (no `game.js` reference exists for this game — only the fruit sprite sheet): grid-based movement on a fixed tick interval, arrow-key-driven direction changes (no 180°-reversal into itself), tail growth on eating fruit, self-collision ends the game, wall collision ends the game (no wrap-around). Follows the `AsteroidsGame.tsx`/`TetrisGame.tsx`/`ArkanoidGame.tsx` structure: `"use client"`, factory scoped inside a mount-time `useEffect`, no module-level state, `forwardRef` + `useImperativeHandle` exposing `restart()`.
- Snake body/head rendered as neon CRT-glow blocks on canvas (vector `fillRect` + glow, matching the site's palette — green, per the catalog's existing `color: "green"`), grid background subtly visible (matching the `.crt-screen` aesthetic used elsewhere). Food is drawn using the sprite atlas (`drawImage` with the ported coordinates), picking a random fruit from the atlas each time food spawns.
- Speed progression: the movement tick interval shortens every 5 fruits eaten (classic ramp), reported to the HUD via `onLevelChange` as an incrementing tier (level 1 for fruit count 0–4, level 2 for 5–9, etc.), mirroring how `TetrisGame` reports level from lines cleared.
- Single-life model like `TetrisGame`: no `onLivesChange`, wired into the registry with `fixedLives: 1`; any collision (wall or self) immediately triggers `onGameOver(finalScore)`.
- Props follow the established pattern: `paused`, `onScoreChange(score)`, `onLevelChange(level)`, `onGameOver(finalScore)` — no `onLivesChange` (same shape as `TetrisGameProps`).
- Keyboard input scoped to the component's mount lifetime: `ArrowUp/Down/Left/Right` change direction (ignoring a reversal that would immediately collide with the snake's own neck), with `preventDefault()`, added in the effect and removed on cleanup.
- In-canvas score/level/game-over text is not drawn — the page's `.player-hud` and existing game-over modal already cover both.
- Evolve `app/games/[id]/play/page.tsx`'s `GAME_COMPONENTS` registry with one new entry (`snake` → `SnakeGame`, `fixedLives: 1`), following the exact pattern established for `tetris`.
- A new Supabase migration (`mcp__supabase__apply_migration`) that updates the existing `games` row from `id = 'serpentina'` to `id = 'snake'` (and `title` to `'SNAKE'`), verified safe beforehand since `select count(*) from scores where game_id = 'serpentina'` returns 0 (no scores reference it yet).
- Verify with Playwright MCP per the acceptance criteria below.

**Out of scope (for future specs):**

- Wrap-around walls, multiple lives, or difficulty settings — single classic ruleset only, matching the "Snake = one mistake ends it" convention confirmed above.
- Touch/on-screen/swipe controls — keyboard only, matching every other ported game's convention.
- Multiple simultaneous fruits, power-ups, obstacles, or "poison" fruit variants sometimes seen in Snake clones — one random fruit at a time from the atlas, no special effects per fruit type.
- A mute/volume control or any sound effects — Snake stays silent like `asteroides`/`tetris` (audio is `arkanoid`-only per spec 07's decision).
- Any change to `/games` filtering/search, `/salon`'s query logic, `/auth`, or the `scores`/`games` table schema/RLS beyond the one id-rename migration (all already correct and game-agnostic per spec 05).
- Any other placeholder game (`gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`) — their fake `.game-arena` stays exactly as-is.
- Removing the now-unused `.cover-snake` CSS rule — left in place as dead code cleanup is out of scope (matches how prior specs haven't retroactively cleaned up unused selectors either).

## Data model

### Catalog entry (`lib/games.ts`)

The `Game` type is unchanged. The existing `"serpentina"` entry is edited in place:

```ts
{
  id: "snake",
  title: "SNAKE",
  short: "Crece sin morder tu propia cola.",
  long: "Una serpiente de luz recorre la grilla buscando frutas al azar. Cada bocado la alarga y la hace más veloz. Un movimiento en falso contra un muro o tu propia cola termina la partida.",
  cat: "ARCADE",
  cover: "cover-snake-2",
  color: "green",
  best: 7820,   // kept from "serpentina" as a placeholder seed value, see decisions
  plays: "9.1K", // kept from "serpentina" as a placeholder seed value, see decisions
}
```

### Fruit sprite atlas (ported from `references/source-assets/snake-assets/sprites.js`)

Kept as a co-located TS object inside/alongside `SnakeGame.tsx`, not a shared `lib/` type:

```ts
type SpriteRect = { x: number; y: number; w: number; h: number };

const FRUIT_SPRITES: Record<string, SpriteRect>; // ported 1:1 from sprites.js's `fruits` map (21 entries: banana, orange, grape, ..., melon)
```

The backing image is loaded once per mount from `/sprites/fruits.png` (copied from `references/source-assets/snake-assets/fruits.png` into `public/sprites/`).

### Component contract (`components/games/SnakeGame.tsx`, local — not a shared `lib/` type)

```ts
type SnakeGameProps = {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};

type SnakeGameHandle = {
  restart: () => void;
};
```

Mirrors `TetrisGameProps`/`TetrisGameHandle` exactly (no `onLivesChange` — single-life model).

### Internal game state (inside the mount-time factory, not exported)

```ts
type Cell = { x: number; y: number }; // grid coordinates, not pixels
type Direction = "up" | "down" | "left" | "right";

// snake: Cell[] (head at index 0), direction: Direction, pendingDirection: Direction,
// food: { cell: Cell; sprite: keyof typeof FRUIT_SPRITES }, score: number,
// fruitsEaten: number (drives speed tier / onLevelChange), tickIntervalMs: number
```

Grid size and cell pixel size are fixed constants tuned to fill the `.crt-screen` canvas area (exact values decided during implementation, not pinned here since they don't affect any other file).

### Play-page game registry (`app/games/[id]/play/page.tsx`)

One new entry added to the existing `GAME_COMPONENTS` registry:

```ts
const GAME_COMPONENTS: Record<
  string,
  {
    Component:
      | typeof AsteroidsGame
      | typeof TetrisGame
      | typeof ArkanoidGame
      | typeof SnakeGame;
    fixedLives?: number;
  }
> = {
  asteroides: { Component: AsteroidsGame },
  tetris: { Component: TetrisGame, fixedLives: 1 },
  arkanoid: { Component: ArkanoidGame },
  snake: { Component: SnakeGame, fixedLives: 1 },
};
```

### Supabase migration

A single `UPDATE` against the existing `games` table (schema from spec 05, unchanged):

```sql
update games set id = 'snake', title = 'SNAKE' where id = 'serpentina';
```

## Implementation plan

1. **Rename the catalog entry**: edit the existing `"serpentina"` object in `lib/games.ts` to the confirmed `"snake"` shape (id, title, short, long, cover) from the Data model section, leaving `cat`/`color`/`best`/`plays` as noted. System stays functional here — `/games` and `/games/snake` show the real card/detail page (still using the fake `.game-arena` on `/play` until step 6). `/games/serpentina` no longer resolves to any catalog entry after this step, same mechanism as spec 07's `bloque-buster` → `arkanoid` rename.

2. **Add new cover art**: in `app/globals.css`, add a new `.cover-snake-2` rule block (+ pseudo-elements as needed) near the existing `.cover-snake`/`.cover-rana` rules, visually distinct from every existing cover. Confirm visually in the browser that the `/games` card renders correctly under the new class name.

3. **Add sprite assets**: create `public/sprites/` and copy `references/source-assets/snake-assets/fruits.png` into it. Port `references/source-assets/snake-assets/sprites.js`'s `fruits` coordinate map into a typed `FRUIT_SPRITES` TS object.

4. **Port the game engine**: create `components/games/SnakeGame.tsx` (`"use client"`), following `components/games/TetrisGame.tsx`'s structure (single-life model, no `onLivesChange`). Inside a mount-time `useEffect`, implement: a fixed-size grid, a snake represented as `Cell[]` with head-first ordering, a game loop driven by `setInterval`/`requestAnimationFrame` at a tick interval that shortens every 5 fruits eaten, direction changes from `ArrowUp/Down/Left/Right` (buffered as `pendingDirection` and applied once per tick, rejecting a 180° reversal), food spawned at a random empty cell with a random `FRUIT_SPRITES` key, tail growth (don't pop the tail) on the tick where the head reaches the food cell, and immediate game-over on wall contact or self-collision. Render on canvas: grid background, snake body/head as neon-glow `fillRect`s in green, food via `drawImage` using the loaded `fruits.png` and the matching `FRUIT_SPRITES` rect. No in-canvas score/level/HUD text, no pause/game-over overlay (the page's `.player-hud` and modal already cover both). Call `onScoreChange`/`onLevelChange` whenever those values change inside the loop, and `onGameOver(score)` on collision. Expose `restart()` via `useImperativeHandle` that resets the snake to its initial position/length, clears fruit count/score, and respawns food. Respect `paused` by skipping tick advancement (canvas still renders the frozen state). Add keyboard listeners in the effect with `preventDefault()` on the four arrow keys, removed on cleanup; clear the tick interval/RAF handle on unmount.

5. **Wire Snake into the play-page registry**: in `app/games/[id]/play/page.tsx`, add the `snake: { Component: SnakeGame, fixedLives: 1 }` entry to the existing `GAME_COMPONENTS` registry, following the exact `tetris` pattern (no other changes to the registry's shape or rendering logic).

6. **Write and apply the Supabase migration**: `update games set id = 'snake', title = 'SNAKE' where id = 'serpentina';` via `mcp__supabase__apply_migration`. Verify with `list_tables`/a `select` that `serpentina` is gone and `snake` is present. Double-check `select count(*) from scores where game_id = 'serpentina'` returns 0 immediately before applying (safe-rename check, same as spec 07's safe-delete check).

7. **Verify with Playwright MCP**: start `npm run dev`, navigate to `/games`, confirm the "SNAKE" card renders under the `ARCADE` filter chip with the new `.cover-snake-2` art (and "SERPENTINA" no longer appears anywhere). Open `/games/snake`, confirm the detail page renders (hero, leaderboard preview showing the empty-state message). Click "JUGAR AHORA", confirm the canvas renders a moving snake and a fruit sprite, arrow keys change direction (with no 180° self-reversal), eating a fruit grows the tail and increases the score, every 5 fruits the movement speeds up (level increments in the HUD), hitting a wall or the snake's own body ends the game immediately. Confirm the outer HUD's Puntuación/Nivel update live from real gameplay, Vidas always shows a single heart, and no HUD/overlay text is drawn a second time inside the canvas. Confirm the existing game-over modal opens with the real final score on collision; save a score and confirm it appears on both `/salon` and the detail page leaderboard (validating the migration's id rename). Confirm `PAUSA`/`REANUDAR`/`FIN`/`SALIR`/`JUGAR DE NUEVO` all behave correctly, and that navigating away and back leaves no leaked interval/`requestAnimationFrame` loop or duplicate keyboard listeners (console check). Re-verify `/games/asteroides/play`, `/games/tetris/play`, and `/games/arkanoid/play` still work unchanged (registry regression check).

8. **Run `npm run lint`** to confirm no lint errors from the new/changed files.

## Acceptance criteria

- [x] `lib/games.ts` no longer contains an entry with `id: "serpentina"`; it contains a `"snake"` entry with the confirmed title/copy/`cat: "ARCADE"`/`color: "green"`/`cover: "cover-snake-2"`.
- [x] `/games` shows a "SNAKE" card with the new `.cover-snake-2` art, filterable under the `ARCADE` chip; no "SERPENTINA" card exists anywhere.
- [x] `/games/snake` renders the detail page (hero, tags, leaderboard) with no runtime errors; the leaderboard preview shows the empty-state message before any score is saved. `/games/serpentina` no longer resolves.
- [x] `/games/snake/play` renders a working canvas game: the snake moves continuously on a grid, arrow keys change direction, a 180° reversal into the snake's own neck is rejected, eating a fruit sprite grows the tail by one segment and increases the score, hitting a wall or the snake's own body ends the game immediately.
- [x] Every 5 fruits eaten, the movement speed increases and the HUD's Nivel value increments accordingly.
- [x] The outer HUD's Puntuación/Nivel values update live from real gameplay while playing Snake; Vidas always shows exactly one heart; no score/level/pause/game-over text or overlay is drawn a second time inside the canvas.
- [x] Colliding with a wall or the snake's own body opens the existing game-over modal with the real final score; saving a score calls the existing `insertScore` flow and the row appears on both `/salon` and `/games/snake`'s leaderboard.
- [x] `PAUSA` freezes the canvas game (snake stops moving) and `REANUDAR` resumes it from the same position/direction; `FIN` ends the game immediately with the current score; `JUGAR DE NUEVO` fully resets the snake, food, score, and level back to their initial values.
- [x] Navigating away (`SALIR`) and back into `/games/snake/play` starts a fresh game with no leftover interval/`requestAnimationFrame` loop or duplicate keyboard listeners (verified via console check, no warnings).
- [x] `/games/asteroides/play`, `/games/tetris/play`, and `/games/arkanoid/play` still behave exactly as before (registry regression check).
- [x] All other placeholder game ids (`gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`) still show the original fake `.game-arena` placeholder and fake score ticker, unchanged.
- [x] The Supabase `games` table has no `id = 'serpentina'` row and has an `id = 'snake'` row with `title = 'SNAKE'` (verified via `list_tables`/a `select`).
- [x] `npm run lint` passes with no new errors.
- [x] Playwright MCP confirms the full flow above end-to-end with no unrelated console errors.

## Decisions

- **Rename/replace the `"serpentina"` entry instead of adding a new `"snake"` entry alongside it** — user's explicit choice, matching the `bloque-buster` → `arkanoid` precedent from spec 07; requires a Supabase migration step (rename the existing `serpentina` row's `id`/`title` rather than delete+insert, since no `scores` rows reference it and an `UPDATE` is simpler than delete+insert for a pure rename).
- **`id` changed, not just `title`** — user's explicit choice, overriding the initial "title only" recommendation; confirmed safe because `select count(*) from scores where game_id = 'serpentina'` returns 0.
- **New cover art (`.cover-snake-2`) instead of reusing `.cover-snake`** — user's explicit correction to the initial recommendation; the existing art no longer reads as sufficiently good for the real game once it's playable.
- **Keep `cat: "ARCADE"` and `color: "green"` unchanged from `"serpentina"`** — no reason to change identity attributes that already fit; this is a rename/upgrade, not a new game.
- **`best`/`plays` seed values kept from `"serpentina"`** (`7820`/`"9.1K"`) — same reasoning as `asteroides`/`tetris`/`arkanoid`: no game in the catalog has real aggregate stats, so carrying the old placeholder forward is no regression.
- **Built from scratch instead of porting a `game.js` reference** — no started-games Snake reference exists; only a fruit sprite atlas (`references/source-assets/snake-assets`) was provided. Classic Nokia-style ruleset (grid movement, growing tail, wall = death) is well-defined enough to implement directly.
- **Neon CRT-glow blocks for the snake body, sprite atlas only for food** — user's explicit choice; keeps the snake itself visually consistent with the site's vector-rendered games while still making use of the provided fruit art.
- **Random fruit per spawn (not a fixed apple/cherry)** — user's explicit choice; adds visual variety since the atlas has 21 fruits and none is scoring/effect-differentiated (see Scope's "no poison variants").
- **Wall = death, no wrap-around** — user's explicit choice (classic arcade rule over Nokia Snake II's wrap behavior).
- **Single life (`fixedLives: 1`), no `onLivesChange`** — user's explicit choice, matching `TetrisGame`'s precedent for a game where any single mistake ends the run.
- **Speed increases every 5 fruits, reported as `onLevelChange`** — user's explicit choice; mirrors how `TetrisGame` derives level from lines cleared, giving Snake a comparable HUD "Nivel" progression instead of a flat constant speed.
- **No sound effects** — consistent with `asteroides`/`tetris`; audio stays `arkanoid`-only per spec 07's decision, no new precedent needed here.
- **`/games/serpentina` is left to 404 after the rename, no redirect added** — user's explicit choice; no game in this catalog has a redirect/alias mechanism, and adding one here would be new scope beyond a straightforward id rename (same as spec 07's `bloque-buster`).
- **Ported as imperative canvas code, not React state** — same reasoning as `asteroides`/`tetris`/`arkanoid`: preserves a fast per-tick simulation without re-render overhead. Factory scoped per mount, no module-level globals.

## Risks

| Risk                                                                                                                           | Mitigation                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Renaming the `games.id` from `serpentina` to `snake` could break existing FK references                                        | Safe only because no `scores` rows reference `serpentina` yet (verified via `select count(*)` immediately before applying the migration, step 6, same as spec 07's safe-delete check).                                 |
| Buffered direction input (`pendingDirection`) applied incorrectly could let the snake reverse into itself on rapid key presses | Direction change is validated against the current heading (reject if it's the exact opposite) before being buffered, and applied only once per tick — verified manually in step 7 by pressing opposite arrows rapidly. |
| Global `keydown` listeners with `preventDefault()` on all four arrow keys block page scrolling while Snake is mounted          | Same accepted tradeoff as `asteroides`/`tetris`/`arkanoid`, scoped tightly to the component's mount/unmount.                                                                                                           |

## What is **not** in this spec

- Wrap-around walls, multiple lives, difficulty settings, touch/swipe controls, power-ups/obstacles/poison fruit variants, sound effects, and a redirect from `/games/serpentina`.
- Any change to `/games` filtering/search, `/salon`'s query logic, `/auth`, or the `scores`/`games` table schema/RLS beyond the one id-rename migration.
- Any other placeholder game (`gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`) or cleanup of the now-unused `.cover-snake` selector.

Each one of those, if it lands, goes in its own spec.
