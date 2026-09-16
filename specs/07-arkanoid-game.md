# 07 — Arkanoid Game

> **Status:** Approved
> **Depends on:** SPEC 04 (asteroides-game — reference pattern for the port), SPEC 06 (tetris-game — precedent for replacing a placeholder + the `GAME_COMPONENTS` registry)
> **Date:** 2026-09-16
> **Objective:** Replace the placeholder catalog entry "BLOQUE BUSTER" with "ARKANOID", a playable canvas port of `references/started-games/04-arkanoid/game.js` (paddle, ball, 5 block levels with increasing speed, 3 lives, brick-break explosion) redrawn with vector shapes, wired into the existing HUD and game-over/save-score modal.

## Scope

**In:**

- Rename the existing catalog entry in `lib/games.ts` from `id: "bloque-buster"` to `id: "arkanoid"`, `title: "BLOQUE BUSTER"` → `title: "ARKANOID"`, updating `short`/`long` copy to describe the real port (confirmed in the Data model section), keeping `cat: "ARCADE"` and `color: "cyan"` unchanged, and updating `cover: "cover-bricks"` → `cover: "cover-arkanoid"`.
- Rename the corresponding CSS rule block in `app/globals.css` from `.cover-bricks` to `.cover-arkanoid` (selector rename only — the existing striped-brick-wall look already reads as Arkanoid-appropriate, no visual redesign required unless the rename reveals it needs adjustment).
- A new client component `components/games/ArkanoidGame.tsx` that ports `references/started-games/04-arkanoid/game.js` almost 1:1: paddle + ball physics, AABB block collisions, 5 levels (from `references/started-games/04-arkanoid/levels.js`, ported into the component or a co-located data file) with increasing ball speed per level, 3 lives, classic scoring (10 pts/block), and a win state after clearing level 5. Follows the `AsteroidsGame.tsx`/`TetrisGame.tsx` structure: `"use client"`, factory scoped inside a mount-time `useEffect`, no module-level state, `forwardRef` + `useImperativeHandle` exposing `restart()`.
- Block/paddle/ball rendering is vector shapes on canvas (rectangles for blocks/paddle, a filled circle for the ball), using the site's neon color palette instead of the reference's spritesheet — no image assets are added to `public/`. Block-break "explosion" is a short vector flash/particle burst instead of the reference's 4-frame sprite animation.
- **Sound effects are ported**: the reference's `assets/sounds/ball-bounce.mp3` and `assets/sounds/break-sound.mp3` are copied into `public/sounds/` and played via `Audio`/`cloneNode()` (matching the reference's own pattern for overlapping rapid plays) on wall/paddle bounce and on block break, respectively. This is the first ported game on the site to include audio — see Decisions.
- Props follow the `AsteroidsGameProps`/`TetrisGameProps` pattern: `paused`, `onScoreChange(score)`, `onLivesChange(lives)`, `onLevelChange(level)`, `onGameOver(finalScore)`.
- Keyboard input scoped to the component's mount lifetime: `ArrowLeft`/`ArrowRight` move the paddle. No mouse-move paddle control (reference supports it, but keyboard-only matches the established `asteroides`/`tetris` convention). The reference's in-canvas `P`/`Escape` pause binding and its pause-overlay level-select (mouse click to jump to level 1–5) are both dropped — pausing is driven exclusively by the page's existing `paused` prop/PAUSA button, and levels only advance by clearing all blocks, matching the `asteroides`/`tetris` convention. Sound playback is skipped while `paused` is true (no bounce/break sounds fire on frames where the game loop doesn't run).
- In-canvas `Score`/`Nivel`/lives-icon HUD text and the `GAME OVER`/win-state overlay text are stripped from the canvas draw call — the page's `.player-hud` and existing game-over modal already cover both. A win (level 5 cleared) is treated as a game-over with the final score, opening the same modal (no separate "you won" UI).
- Evolve `app/games/[id]/play/page.tsx`'s `GAME_COMPONENTS` registry with one new entry (`arkanoid` → `ArkanoidGame`), following the exact pattern established for `asteroides`/`tetris`.
- A new Supabase migration (`mcp__supabase__apply_migration`) that deletes the stale `id = 'bloque-buster'` row from `games` and inserts the new `id = 'arkanoid'` row (`title`, `category`), so `scores.game_id`'s FK accepts inserts for the renamed game.
- Verify with Playwright MCP per the acceptance criteria below.

**Out of scope (for future specs):**

- Mouse-move paddle control and touch/on-screen controls — keyboard only, matching the `asteroides`/`tetris` convention.
- The reference's spritesheet-based rendering and its 4-frame sprite explosion animation — replaced with vector shapes (sound effects, unlike sprites, are explicitly in scope, see above).
- A mute/volume control in the outer HUD — sounds just play at the `Audio` element's default volume; a global audio settings UI is a follow-up if a second audio-enabled game needs it.
- The reference's pause-overlay level-select buttons (jump directly to level 1–5 via mouse click while paused) — dropped in favor of the page's own pause control, same reasoning as `tetris` dropping its `P` key.
- Any change to `/games` filtering/search, `/salon`'s query logic, `/auth`, or the `scores`/`games` table schema/RLS beyond the one seed-row migration (all already correct and game-agnostic per spec 05).
- Any other placeholder game (`serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`) — their fake `.game-arena` stays exactly as-is.
- Redesigning `.cover-arkanoid`'s visuals beyond the selector rename — a fresh cover-art pass is a follow-up if the renamed art turns out to look wrong next to the real game.

## Data model

### Catalog entry (`lib/games.ts`)

The `Game` type is unchanged. The existing `"bloque-buster"` entry is edited in place:

```ts
{
  id: "arkanoid",
  title: "ARKANOID",
  short: "Rebota la pelota y destruye muros de neón.",
  long: "Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos a través de 5 niveles, cada uno más veloz que el anterior. Pierdes una vida si la pelota cae, y solo tienes 3 antes del game over.",
  cat: "ARCADE",
  cover: "cover-arkanoid",
  color: "cyan",
  best: 28450,   // kept from "bloque-buster" as a placeholder seed value, see decisions
  plays: "12.4K", // kept from "bloque-buster" as a placeholder seed value, see decisions
}
```

### Level data (ported from `references/started-games/04-arkanoid/levels.js`)

Kept as a co-located array inside/alongside `ArkanoidGame.tsx`, not a shared `lib/` type:

```ts
type BlockDef = { col: number; row: number; color: string };
type LevelDef = { blocks: BlockDef[]; speed: number };

const LEVELS: LevelDef[]; // 5 entries, ported 1:1 from levels.js (grid, pyramid, checkerboard, gapped rows, frame+cross), speed 1.0 → 1.46
```

### Component contract (`components/games/ArkanoidGame.tsx`, local — not a shared `lib/` type)

```ts
type ArkanoidGameProps = {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};

type ArkanoidGameHandle = {
  restart: () => void;
};
```

Mirrors `AsteroidsGameProps`/`AsteroidsGameHandle` exactly (paddle+ball game reports lives like asteroids does, unlike tetris's single life).

### Sound assets

Two new static files added under `public/sounds/`:

```
public/sounds/ball-bounce.mp3
public/sounds/break-sound.mp3
```

Copied verbatim from `references/started-games/04-arkanoid/assets/sounds/`. Loaded once per component mount (`new Audio("/sounds/ball-bounce.mp3")` etc.) and played via `.cloneNode().play()` on each bounce/break event, matching the reference's own approach for overlapping rapid plays.

### Play-page game registry (`app/games/[id]/play/page.tsx`)

One new entry added to the existing `GAME_COMPONENTS` registry (established in spec 06):

```ts
const GAME_COMPONENTS: Record<
  string,
  {
    Component: typeof AsteroidsGame | typeof TetrisGame | typeof ArkanoidGame;
    fixedLives?: number;
  }
> = {
  asteroides: { Component: AsteroidsGame },
  tetris: { Component: TetrisGame, fixedLives: 1 },
  arkanoid: { Component: ArkanoidGame },
};
```

No `fixedLives` needed — `ArkanoidGame` reports lives via `onLivesChange` like `AsteroidsGame` does.

### Supabase migration

A single `DELETE` + `INSERT` against the existing `games` table (schema from spec 05, unchanged):

```sql
delete from games where id = 'bloque-buster';
insert into games (id, title, category) values ('arkanoid', 'ARKANOID', 'ARCADE');
```

## Implementation plan

1. **Rename the catalog entry**: edit the existing `"bloque-buster"` object in `lib/games.ts` to the confirmed `"arkanoid"` shape (id, title, short, long, cover) from the Data model section, leaving `cat`/`color`/`best`/`plays` as noted. System stays functional here — `/games` and `/games/arkanoid` show the real card/detail page (still using the fake `.game-arena` on `/play` until step 5), and `/games/bloque-buster` now 404s (expected).

2. **Rename the cover-art selector**: in `app/globals.css`, rename `.cover-bricks` (and its `::after` pseudo-element rule) to `.cover-arkanoid`, no other changes. Confirm visually in the browser that the card still renders correctly under the new class name.

3. **Add sound assets**: copy `references/started-games/04-arkanoid/assets/sounds/ball-bounce.mp3` and `break-sound.mp3` into `public/sounds/`.

4. **Port the game engine**: create `components/games/ArkanoidGame.tsx` (`"use client"`), following `components/games/AsteroidsGame.tsx`'s structure. Move `game.js`'s paddle/ball state, `LEVELS` data (redrawn as vector `LevelDef[]`, ported from `levels.js`), `collideAABB`, `update`, and scoring into a factory function created inside a mount-time `useEffect`, closing over a canvas ref and local (non-module-level) state so remounts never collide. Replace `drawSprite`/`drawFrame` calls with vector `fillRect`/`arc` drawing using the site's neon palette; replace the 4-frame sprite explosion with a short vector flash/particle burst keyed off the same `explosions` array/`elapsed` timing. Load the two sound files once per mount and play them via `.cloneNode().play()` on wall/paddle bounce and block break, skipping playback while `paused`. Strip the reference's in-canvas `Score`/`Nivel`/lives-icon HUD text, its `GAME OVER`/win overlays, its `P`/`Escape` pause handling, and its pause-overlay level-select click handler entirely (the page's `.player-hud`, `paused` prop, and modal already cover all of that). Wire `ArrowLeft`/`ArrowRight` with `preventDefault()`, added in the effect and removed on cleanup. Call `onScoreChange`/`onLivesChange`/`onLevelChange` whenever those values change inside the loop, and `onGameOver(score)` both on the ball-lost-last-life path and on clearing level 5 (win treated as game over). Expose `restart()` via `useImperativeHandle` that re-runs the equivalent of `initPaddle()` + `loadLevel(1)` + resets lives/score. Respect `paused` by skipping `update()` (still `draw()`s) each `requestAnimationFrame` tick, and always cancel the RAF handle and revoke audio references on unmount.

5. **Wire Arkanoid into the play-page registry**: in `app/games/[id]/play/page.tsx`, add the `arkanoid: { Component: ArkanoidGame }` entry to the existing `GAME_COMPONENTS` registry (no `fixedLives`, no other changes to the registry's shape or rendering logic).

6. **Write and apply the Supabase migration**: `delete from games where id = 'bloque-buster'; insert into games (id, title, category) values ('arkanoid', 'ARKANOID', 'ARCADE');` via `mcp__supabase__apply_migration`. Verify with `list_tables`/a `select` that `bloque-buster` is gone and `arkanoid` is present. Double-check `select count(*) from scores where game_id = 'bloque-buster'` returns 0 immediately before applying (safe-delete check, same as spec 06).

7. **Verify with Playwright MCP**: start `npm run dev`, navigate to `/games`, confirm the "ARKANOID" card renders under the `ARCADE` filter chip (and "BLOQUE BUSTER" no longer appears anywhere). Open `/games/arkanoid`, confirm the detail page renders (hero, leaderboard preview showing the empty-state message). Click "JUGAR AHORA", confirm the canvas renders blocks/paddle/ball as vector shapes, paddle responds to `ArrowLeft`/`ArrowRight`, ball bounces off walls/paddle/blocks with audible sound, breaking a block adds 10 points and shows a vector break flash, clearing all blocks in a level advances to the next (faster) level, and losing the ball decrements lives. Confirm the outer HUD's Score/Vidas/Nivel update live from real gameplay, and that no HUD/overlay text is drawn a second time inside the canvas. Lose all 3 lives (or clear level 5) and confirm the existing game-over modal opens with the real final score; save a score and confirm it appears on both `/salon` and the detail page leaderboard (validating the migration's FK fix). Confirm `PAUSA`/`REANUDAR`/`FIN`/`SALIR`/`JUGAR DE NUEVO` all behave correctly (including that sounds stop firing while paused), and that navigating away and back leaves no leaked `requestAnimationFrame` loop or duplicate keyboard listeners (console check). Re-verify `/games/asteroides/play` and `/games/tetris/play` still work unchanged (registry regression check).

8. **Run `npm run lint`** to confirm no lint errors from the new/changed files.

## Acceptance criteria

- [ ] `lib/games.ts` no longer contains an entry with `id: "bloque-buster"`; it contains an `"arkanoid"` entry with the confirmed title/copy/`cat: "ARCADE"`/`color: "cyan"`/`cover: "cover-arkanoid"`.
- [ ] `/games` shows an "ARKANOID" card with `.cover-arkanoid` art, filterable under the `ARCADE` chip; no "BLOQUE BUSTER" card exists anywhere.
- [ ] `/games/arkanoid` renders the detail page (hero, tags, leaderboard) with no runtime errors; the leaderboard preview shows the empty-state message before any score is saved.
- [ ] `/games/arkanoid/play` renders a working canvas game: paddle moves with `ArrowLeft`/`ArrowRight`, ball bounces off walls/paddle/blocks, breaking a block removes it and adds exactly 10 points, clearing all blocks in a level loads the next level at increased ball speed, clearing level 5 ends the game (treated as game over).
- [ ] Bounce and block-break sounds are audible during gameplay and do not fire while `PAUSA` is active.
- [ ] The outer HUD's Puntuación/Vidas/Nivel values update live from real gameplay while playing Arkanoid; no score/lives/level text or pause/game-over overlay is drawn a second time inside the canvas.
- [ ] Losing all 3 lives (or clearing level 5) opens the existing game-over modal with the real final score; saving a score calls the existing `insertScore` flow and the row appears on both `/salon` and `/games/arkanoid`'s leaderboard.
- [ ] `PAUSA` freezes the canvas game (no paddle/ball movement, no sounds) and `REANUDAR` resumes it; pressing `P` or `Escape` on the keyboard does nothing; clicking anywhere on the canvas while paused does nothing (no level-select overlay); `FIN` ends the game immediately with the current score; `JUGAR DE NUEVO` fully resets the board, score, lives, and level back to their initial values.
- [ ] Navigating away (`SALIR`) and back into `/games/arkanoid/play` starts a fresh game with no leftover `requestAnimationFrame` loop or duplicate keyboard listeners (verified via console check, no warnings).
- [ ] `/games/asteroides/play` and `/games/tetris/play` still behave exactly as before (registry regression check).
- [ ] All other placeholder game ids (`serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`) still show the original fake `.game-arena` placeholder and fake score ticker, unchanged.
- [ ] The Supabase `games` table has no `id = 'bloque-buster'` row and has an `id = 'arkanoid'` row (verified via `list_tables`/a `select`).
- [ ] `npm run lint` passes with no new errors.
- [ ] Playwright MCP confirms the full flow above end-to-end with no unrelated console errors.

## Decisions

- **Rename/replace the `"bloque-buster"` entry instead of adding a new `"arkanoid"` entry alongside it** — user's explicit choice, matching the `tetris`/`caida` precedent from spec 06 rather than the `asteroides`/`rocas` precedent from spec 04; justified because `"bloque-buster"`'s existing copy already describes this exact game near-verbatim. Requires a Supabase migration step (delete the stale `bloque-buster` row, insert `arkanoid`).
- **Keep `cat: "ARCADE"` and `color: "cyan"` unchanged from `"bloque-buster"`** — no reason to change identity attributes that already fit; this is a rename/upgrade, not a new game.
- **Rename `.cover-bricks` → `.cover-arkanoid` with no visual redesign** — same reasoning as `tetris`'s cover rename: the existing art is already thematically correct for this slot.
- **`best`/`plays` seed values kept from `"bloque-buster"`** (`28450`/`"12.4K"`) — same reasoning as `asteroides`/`tetris`: no game in the catalog has real aggregate stats, so carrying the old placeholder forward is no regression.
- **Vector rendering instead of the reference's spritesheet** — user's explicit choice; keeps this port consistent with `AsteroidsGame`/`TetrisGame`, avoids introducing an image-asset-loading pattern (and a `public/` image asset) that no other game needs yet.
- **Sound effects ported, breaking from the `asteroides`/`tetris` "no audio" precedent** — user's explicit correction; this is the first game on the site with sound. Implemented as static `.mp3` files in `public/sounds/` played via `Audio`/`cloneNode()`, the simplest approach that matches the reference's own technique — no audio library or global mute control introduced (see Scope's "Out of scope").
- **Reference's mouse-move paddle control dropped, keyboard-only** — matches the `asteroides`/`tetris` convention; avoids canvas-to-client coordinate scaling logic (`getBoundingClientRect` + scale factors) that isn't needed by either existing port.
- **Reference's pause-overlay level-select (click to jump to level 1–5) dropped entirely** — user's explicit choice; matches `tetris` dropping its `P` key, keeps pause behavior identical and predictable across all three ported games (driven solely by the page's `paused` prop/PAUSA button).
- **Win state (level 5 cleared) treated as game over, no separate "you won" UI** — avoids adding a new modal/overlay state to the play page; the existing game-over modal with the real final score already communicates a successful run.
- **Ported as imperative canvas code, not React state** — same reasoning as `asteroides`/`tetris`: preserves the proven game loop, avoids re-render overhead for a fast per-frame simulation. Factory scoped per mount, no module-level globals.
- **No `fixedLives` needed in the registry entry** — unlike `tetris`, Arkanoid has a real decrementing lives counter (3 lives, reference behavior), so it reports lives via `onLivesChange` like `asteroides` does.

## Risks

| Risk                                                                                                                                  | Mitigation                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deleting the `id = 'bloque-buster'` row from `games` is destructive                                                                   | Safe only because `"bloque-buster"` was never wired to a real play page (no `scores` rows can reference it). Verified via `select count(*)` immediately before applying the migration (step 6), same as spec 06.                          |
| First game with audio — no established convention for asset loading/cleanup                                                           | `Audio` objects created inside the mount-time factory (not module-level) and their references dropped on unmount, so no lingering playback across remounts; verified in step 7 (navigate away mid-sound, confirm it stops/doesn't leak).  |
| Vector re-implementation of block/paddle/ball visuals may look flatter than the reference's sprites                                   | Accepted tradeoff for consistency with `AsteroidsGame`/`TetrisGame`'s style; the site's existing neon palette and glow effects (used elsewhere in the CRT theme) are applied to keep it visually consistent rather than plain rectangles. |
| Dropping the level-select-on-pause-click handler removes a way to test/skip levels quickly during manual QA                           | Acceptable — `JUGAR DE NUEVO` plus normal play is enough to reach later levels during verification (step 7), same tradeoff already accepted for `tetris`'s dropped debug conveniences.                                                    |
| Global `keydown`/`keyup` listeners with `preventDefault()` on `ArrowLeft`/`ArrowRight` block page scrolling while Arkanoid is mounted | Same accepted tradeoff as `asteroides`/`tetris`, scoped tightly to the component's mount/unmount.                                                                                                                                         |
