# 04 — Asteroids Game

**State:** Implemented
**Dependencies:** None (independent of specs 01/02/03)
**Date:** 2026-09-14

**Objective:** Add a new "ASTEROIDES" game to the catalog whose `/games/asteroides/play` page runs a real, fully playable port of `references/started-games/02-asteroids/game.js` on canvas, wired into the existing player HUD (real score/lives/level) and the existing game-over/save-score modal.

## Scope

**In scope:**

- New `GAMES` entry in `lib/games.ts` with `id: "asteroides"`, `title: "ASTEROIDES"`, category `SHOOTER`, color `yellow`, the copy confirmed below, and a `cover: "cover-asteroides"`.
- New cover-art CSS rules `.cover-asteroides` (and pseudo-elements as needed) in `app/globals.css`, visually distinct from the existing `.cover-rocas` (starfield + ship silhouette look is fine, but not an identical copy of rocas's rules).
- A new client component, e.g. `components/games/AsteroidsGame.tsx`, that ports `game.js`'s classes (`Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`) and its `update`/`draw`/`loop` logic almost 1:1 into a self-contained factory scoped per mount (no module-level globals), rendering to a `<canvas>` at the original 800×600 logical resolution (matches `.crt-screen`'s 4:3 aspect, so it fills the frame via CSS without distortion).
- The component exposes a small callback/imperative API to the page: `onScoreChange(score)`, `onLivesChange(lives)`, `onLevelChange(level)`, `onGameOver(finalScore)`, plus imperative controls the page can call: `pause()`, `resume()`, `restart()`. Internal per-frame `drawHUD()` text (`SCORE`, `NIVEL`, life-ship icons, `3x` power-up timer) is removed from the canvas draw call since that data now lives in the page's existing HUD — the canvas only draws the game world (ship, asteroids, bullets, particles, power-ups) and the `GAME OVER` overlay text stays out too, since the page's own modal already covers that.
- `app/games/[id]/play/page.tsx` branches on `game.id === "asteroides"`: instead of the fake `.game-arena` markup and the `setInterval` fake score ticker, it mounts `<AsteroidsGame />`, wires its callbacks into the existing `score`/`lives`/`level` state, wires the existing `PAUSA`/`FIN`/`SALIR` buttons to the component's `pause()`/`resume()`/forcing `over=true` and unmount, and wires `JUGAR DE NUEVO` to `restart()`. All other game ids keep today's fake placeholder arena unchanged.
- Keyboard input (`ArrowLeft/Right/Up`, `Space`) is captured only while this component is mounted, with `preventDefault()` on those keys so the page doesn't scroll while playing; listeners are added on mount and removed on unmount (component may mount/unmount multiple times as the user navigates to/from the page, e.g. via `SALIR` then back).
- Lives are capped/driven by the ported game's own rules (3 lives, temporary invincibility with blink on respawn); the outer page's `lives` state is a mirror of the component's internal lives, not an independent counter.
- Verify with Playwright MCP: play the game, confirm the canvas renders and responds to keyboard input, confirm score/lives/level in the outer HUD update as asteroids are destroyed/the ship dies/levels clear, confirm death after 3 lives opens the existing game-over modal with the real final score, confirm save-score and "JUGAR DE NUEVO" both work.

**Not in scope:**

- Reusing or modifying the existing `"rocas"` card — left untouched per user decision, even though its description already reads like an asteroids game.
- Any other placeholder game (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) — their fake `.game-arena` stays exactly as-is.
- Touch/on-screen controls — keyboard only, matching the reference 1:1; touch support can be a follow-up spec.
- Any change to score persistence mechanics (`lib/useUser.ts`'s `saveScore`, localStorage format) — the real score is fed into the exact same save flow that already exists.
- Any change to `/games` filtering/search, `/salon`, `/auth`, or Supabase.
- Sound effects, mobile-specific layout changes, or leaderboard integration beyond what already exists on the detail page.

## Data model

The `Game` type in `lib/games.ts` is unchanged; the new catalog entry is just a new value of the existing shape:

```ts
{
  id: "asteroides",
  title: "ASTEROIDES",
  short: "Pilota una nave triangular y pulveriza rocas espaciales.",
  long: "Flota a la deriva en gravedad cero y dispara contra un campo de asteroides que se fragmenta con cada impacto. Consigue un power-up de disparo triple destruyendo rocas seguidas, y sobrevive con solo 3 vidas mientras el nivel se vuelve cada vez más denso.",
  cat: "SHOOTER",
  cover: "cover-asteroides",
  color: "yellow",
  best: 41200,   // kept from "rocas" as a placeholder seed value, see decisions
  plays: "0",
}
```

The only new _shape_ introduced is the local callback/handle contract between the page and the game component, kept inside `components/games/AsteroidsGame.tsx` (not a shared `lib/` type — used in exactly one place):

```ts
type AsteroidsGameProps = {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};

type AsteroidsGameHandle = {
  restart: () => void;
};
```

`AsteroidsGameHandle` is exposed via `useImperativeHandle` so the page's `JUGAR DE NUEVO` button can call `restart()` directly; `paused` is a plain prop (the component's internal loop skips `update()` while `paused` is true, mirroring `game.js`'s `state === 'dead'`-style early-return, but driven by the page's existing pause button instead of a new key binding).

## Implementation plan

1. **Add the catalog entry**: append the `asteroides` object (above) to `GAMES` in `lib/games.ts`. System is already functional here — `/games` and `/games/asteroides` show a real card and detail page with a leaderboard, still using the fake `.game-arena` on `/play` until step 4.

2. **Add cover art**: write `.cover-asteroides` (+ `::before`/`::after` as needed) in `app/globals.css`, near the existing `.cover-rocas`/`.cover-invaders` rules, giving the card a distinct starfield/asteroid-field look (not copy-pasted from `.cover-rocas`).

3. **Port the game engine**: create `components/games/AsteroidsGame.tsx` (`"use client"`). Move `game.js`'s constants, `Bullet`/`Asteroid`/`PowerUp`/`Ship`/`Particle` classes, and `update`/`draw`/`initGame`/`nextLevel`/`explode`/`killShip`/`spawnAsteroids` logic into a factory function created inside a `useEffect` on mount, closing over a `canvas` ref instead of `document.getElementById`, and over local (non-module-level) state so multiple mounts never collide. Strip `drawHUD()`'s text/life-icon drawing and the `drawOverlay('GAME OVER', ...)` call from `draw()` (the page's own HUD/modal covers both now). Wire `keydown`/`keyup` listeners with `preventDefault()` for `ArrowLeft/ArrowRight/ArrowUp/Space`, added in the effect and removed in its cleanup. Call `onScoreChange`/`onLivesChange`/`onLevelChange` whenever those values change inside `update()`, and `onGameOver(score)` from `killShip()`'s `state = 'gameover'` branch instead of waiting for a `Space` press to restart. Expose `restart()` via `useImperativeHandle` that re-runs the equivalent of `initGame()`. Respect the `paused` prop by skipping the `update()` call (still `draw()`s) each `requestAnimationFrame` tick, and always cancel the `requestAnimationFrame` handle on unmount.

4. **Wire it into the play page**: in `app/games/[id]/play/page.tsx`, when `game.id === "asteroides"`, render `<AsteroidsGame ref={...} paused={paused} onScoreChange={setScore} onLivesChange={setLives} onLevelChange={setLevel} onGameOver={() => setOver(true)} />` inside `.crt-screen` in place of `.game-arena`, and drop the existing fake `setInterval` score-ticker `useEffect` for this game id (other ids keep it as-is). `lives`/`level` become real state (today `lives` is a fixed `useState(3)` and `level` is derived from `score`; for `asteroides` both need to become values the callbacks can set — introduce local `lives`/`level` state used only when playing asteroides, falling back to today's fixed/derived values for every other game id, so no other game's behavior changes). Wire `PAUSA`/`REANUDAR` to the existing `paused` toggle (now meaningfully pausing the canvas loop), `FIN` to directly call `onGameOver`-equivalent (set `over(true)` using the current live score) and `JUGAR DE NUEVO` to call the component's `restart()` in addition to the existing `restart()` state resets.

5. **Verify with Playwright MCP**: start `npm run dev`, navigate to `/games/asteroides`, confirm the card/detail page render correctly, click "JUGAR AHORA", confirm the canvas renders the ship/asteroids and responds to arrow keys/space (screenshot + console check), destroy an asteroid and confirm the outer HUD score increases, force/wait for a death and confirm lives decrements and the outer HUD reflects it, drive the ship into asteroids until game over and confirm the existing modal appears with the real final score, save a score and confirm `JUGAR DE NUEVO` resets score/lives/level and the canvas, confirm `PAUSA` actually freezes the game and `SALIR` cleanly unmounts (no console errors, no leaked RAF loop — navigate back in and confirm a fresh game starts).

6. **Run `npm run lint`** to confirm no lint errors from the new/changed files.

## Acceptance criteria

- [ ] `lib/games.ts` includes a new `GAMES` entry with `id: "asteroides"`, matching the confirmed title/copy/cat/color.
- [ ] `/games` shows an "ASTEROIDES" card with a distinct `.cover-asteroides` cover art, filterable under the `SHOOTER` chip.
- [ ] `/games/asteroides` renders the detail page (hero, tags, leaderboard) with no runtime errors.
- [ ] `/games/asteroides/play` renders a working canvas game: ship rotates/thrusts with arrow keys, fires with space, asteroids wrap toroidally and split on hit, particles/power-up spawn per the original logic.
- [ ] The outer HUD's Score/Vidas/Nivel values update live from real gameplay (not the fake ticker) while playing asteroides; no score/level/lives text is drawn a second time inside the canvas.
- [ ] Losing all 3 lives opens the existing game-over modal with the real final score; saving a score calls the existing `saveScore` flow unchanged.
- [ ] `PAUSA` freezes the canvas game (no update, ship/asteroids stop moving) and `REANUDAR` resumes it; `FIN` ends the game immediately with the current score; `JUGAR DE NUEVO` fully resets the canvas game (ship, asteroids, score, lives, level) as well as the page's own state.
- [ ] Navigating away (`SALIR`) and back into `/games/asteroides/play` starts a fresh game with no leftover `requestAnimationFrame` loop or duplicate keyboard listeners (verified via console/network checks, no warnings).
- [ ] All other game ids (`rocas`, `bloque-buster`, etc.) still show the original fake `.game-arena` placeholder and fake score ticker, unchanged.
- [ ] `npm run lint` passes with no new errors.
- [ ] Playwright MCP confirms the full flow above end-to-end with no unrelated console errors.

## Decisions taken and discarded

- **New `"asteroides"` catalog entry instead of reusing `"rocas"`** — user's explicit choice, even though `"rocas"`'s existing copy already describes an asteroids game near-verbatim; `"rocas"` is left as an unrelated placeholder rather than repurposed, to avoid retroactively changing an existing card's identity/best-score/plays history.
- **Ported as imperative canvas code, not rewritten in React state** — user's explicit choice; preserves the proven 60fps game loop and avoids React re-render overhead for a fast-moving bullet/particle simulation. The factory is scoped per component mount (no module-level globals) so it's safe against remounting when navigating to/from the page, unlike the original single-page script.
- **Real score/lives/level drive the existing outer `.player-hud`, in-canvas text HUD removed** — user's explicit choice; avoids duplicating the same numbers in two places on screen, and reuses the site's existing pixel-font HUD styling instead of the reference's plain monospace canvas text.
- **Keyboard-only controls, no touch** — user's explicit choice; matches `game.js` 1:1, keeps this spec scoped to porting the engine. Touch controls (to actually back up the "TÁCTIL" tag shown on every game's detail page) are deferred to a future spec.
- **`"rocas"` left completely untouched** — user's explicit choice; no copy changes, despite the near-duplicate description, to keep this spec additive-only.
- **`best`/`plays` seed values are placeholders** (`best: 41200` copied as a plausible number, `plays: "0"`) — this spec doesn't add real persistence/aggregation for a "best score across all players" or play-count; the detail page's leaderboard already uses `seededScores()` (deterministic fake data keyed by id length), unaffected by this choice. Not treated as a gap since no other game in the catalog has real aggregate stats either.
- **`FIN` ends the game immediately using the current live score**, rather than simulating ship death — matches today's behavior for every other (fake) game on this page; simplest way to let a player bail out and still get to save their score.
- **No sound effects** — the reference `game.js` has none either; out of scope, consistent with every other game on the site (no game currently has audio).

## Identified risks

- **Global `keydown`/`keyup` listeners with `preventDefault()`** on `ArrowUp/Left/Right`/`Space` will block page scrolling while the game is mounted — acceptable while actively playing, but must be scoped tightly to the component's mount/unmount (not attached at the page or layout level) so it never leaks into other routes.
- **Reconciling `lives`/`level` as real state only for `asteroides`** while every other game id keeps the current fixed/derived values touches shared logic in `app/games/[id]/play/page.tsx` — care is needed in step 4 so the branch doesn't regress the fake placeholder experience for the other 7 games.
- **`.crt-screen`'s `aspect-ratio: 4/3` relies on the canvas's logical 800×600 resolution matching exactly** — if that CSS block changes in a future spec, the canvas would need explicit resizing/scaling logic it doesn't have today.
