# 01 — Home Page

**State:** Implemented
**Dependencies:** None (first spec in this project)
**Date:** 2026-09-05

**Objective:** Replace the current `/` route (which is actually the game library) with the marketing landing page from `references/templates/home-about/home.jsx`, moving the existing library grid to `/games` and renaming the game-detail routes to `/games/[id]` and `/games/[id]/play` to match, verified with Playwright MCP against the running dev server.

## Scope

**In scope:**
- New landing page at `/` ported from `references/templates/home-about/home.jsx`: hero with floating pixel silhouettes, "why Arcade Vault" features grid, games preview rail (first 6 games), stats band, live-activity section (recent-scores ticker + top-players list), pricing/FAQ section (ported as-is), final CTA.
- Move the current library grid (search + category chips + game grid) from `app/page.tsx` to `app/games/page.tsx`.
- Rename `app/juegos/[id]/page.tsx` → `app/games/[id]/page.tsx` and `app/juegos/[id]/jugar/page.tsx` → `app/games/[id]/play/page.tsx`, updating all internal links (`GameCard.tsx`, detail page, player page) to the new paths.
- Update `components/Nav.tsx`: add an "Inicio" link to `/`, repoint "Biblioteca" to `/games`.
- Port the needed CSS (`.home-*`, `.feature-card`, `.mini-card`, `.activity-card`, `.pricing-grid`, etc.) from the template's `styles.css` into `app/globals.css`.
- Recent-scores ticker and top-players list on the home page will be generated from `lib/scores.ts` (`seededScores`) instead of the template's hardcoded names, using real `GAMES` data for the games preview rail and game names in the ticker.
- Verify the finished page with Playwright MCP against `npm run dev` (visual load, hero renders, games preview links to `/games/[id]`, nav links work, no console errors).

**Not in scope:**
- The About page (`about.jsx` / `/acerca-de` or similar) — explicitly deferred to a later spec.
- Any real backend/auth/billing behind the pricing section — it's static marketing content only, no Stripe or gating logic.
- Real live activity data (WebSocket/polling) — the ticker stays a static/seeded snapshot like the rest of the app.
- Changing `lib/scores.ts`'s existing signature/behavior used by `/salon` and the game detail page.

## Data model

No new persisted data types or storage are introduced. The home page derives everything from existing sources:

- **Games preview rail** — `GAMES.slice(0, 6)` from `lib/games.ts`, rendered with a local `MiniCard` (title, category, cover art), linking to `/games/[id]`.
- **Top players (today)** — `seededScores(SEED_TOP, 5)` from `lib/scores.ts`, reusing its existing `ScoreRow` shape (`rank`, `name`, `score`, `date`); rendered as a ranked bar list like the template.
- **Recent-scores ticker** — since `ScoreRow` has no game/time-ago field, each ticker row is built locally as:
  ```ts
  type TickerRow = { player: string; game: string; score: number; timeAgo: string };
  ```
  Populated by pairing one `seededScores(seed, 1)[0]` result per row with a game picked from `GAMES` (cycled) and a fixed `timeAgo` string from a static list (`["hace 2 min", "hace 5 min", ...]`), mirroring the template's flavor text since there is no real timestamp/event source in the app. This mapping lives inline in `app/page.tsx` — no new file.

## Implementation plan

1. **Move the library page**: create `app/games/page.tsx` with the exact current contents of `app/page.tsx` (search, category chips, grid). Leave `app/page.tsx` untouched for now — system still builds/runs after this step.
2. **Rename game routes**: move `app/juegos/[id]/page.tsx` → `app/games/[id]/page.tsx` and `app/juegos/[id]/jugar/page.tsx` → `app/games/[id]/play/page.tsx`. Update the internal `Link` hrefs inside both moved files (`/juegos/${id}/jugar` → `/games/${id}/play`, `/juegos/${id}` → `/games/${id}`, and both "VOLVER AL VAULT" links → `/games`). Delete the now-empty `app/juegos/` directory.
3. **Update `GameCard.tsx`**: change its `Link href` from `/juegos/${game.id}` to `/games/${game.id}`.
4. **Update `Nav.tsx`**: add an "Inicio" link (`/`) before "Biblioteca"; change "Biblioteca"'s href from `/` to `/games`; update `isActive` logic so `/games` (and its sub-routes) highlight "Biblioteca" instead of `/`.
5. **Port CSS**: append the home-page-related rules from the template's `styles.css` (`.home-hero`, `.home-silos` + `.silo`, `.home-section`, `.feature-card`, `.mini-*`, `.home-stats`, `.activity-card` additions, `.pricing-grid`, `.price-card`, `.faq-item`, `.home-final`, etc.) into `app/globals.css`, reusing the existing CSS variables already defined there (no new color tokens needed).
6. **Build the new home page** in `app/page.tsx` (replacing the library content moved in step 1): `"use client"`, containing a local `useReveal` hook (scroll-reveal via `IntersectionObserver`, ported from the template), `FloatingSilhouettes`, `MiniCard`, and the page sections (hero, why-us, games preview, stats, activity/leaderboard, pricing, final CTA), using `next/link`'s `Link` instead of the template's `navigate()` calls (`/games` for library CTAs, `/auth` for account CTAs, `/salon` for leaderboard link).
7. **Verify with Playwright MCP**: start `npm run dev`, navigate to `/`, confirm hero/sections render, click through to `/games`, a game detail (`/games/[id]`), and the play route (`/games/[id]/play`), check `/salon` and nav links still work, and check the browser console for errors.
8. **Run `npm run lint`** to confirm no lint errors from the new/moved files.

## Acceptance criteria

- [x] `app/page.tsx` renders the new landing page (hero, why-us features, games preview, stats, activity/leaderboard, pricing/FAQ, final CTA) with no runtime errors.
- [x] `app/games/page.tsx` exists and renders the search + category-filter + game grid, identical in behavior to the previous `/` page.
- [x] Visiting `/games/[id]` for every game in `GAMES` renders the detail page (no 404s); the "JUGAR AHORA" button links to `/games/[id]/play`.
- [x] `/games/[id]/play` renders the player screen; its "SALIR" link goes to `/games/[id]`.
- [x] Both "VOLVER AL VAULT" links (game-over modal on `/games/[id]/play` and the detail page on `/games/[id]`) go to `/games`.
- [x] `app/juegos/` no longer exists in the repo.
- [x] `Nav.tsx` shows an "Inicio" link to `/` and a "Biblioteca" link to `/games`; both correctly show `.active` styling on their respective routes (including sub-routes under `/games`).
- [x] Home page's "EXPLORAR JUEGOS" / "VER TODOS LOS JUEGOS" / "INSERTAR MONEDA" CTAs link to `/games`; "CREAR CUENTA" / "EMPEZAR GRATIS" CTAs link to `/auth`; "VER SALÓN" links to `/salon`.
- [x] Games preview rail on the home page shows exactly the first 6 entries from `GAMES` and each links to `/games/[id]`.
- [x] Top-players list and recent-scores ticker on the home page are generated via `lib/scores.ts`, not hardcoded template names.
- [x] `npm run lint` passes with no new errors.
- [x] Playwright MCP confirms: page loads at `/`, no console errors, and clicking through the games preview and nav links lands on the correct routes.

## Decisions taken and discarded

- **Library route is `/games` (not `/juegos` or `/biblioteca`)** — user's explicit choice, accepting inconsistency with the Spanish `av-*` CSS class names and Spanish copy elsewhere; game detail/play routes renamed to match (`/games/[id]`, `/games/[id]/play`).
- **Ticker data sourced from `lib/scores.ts`, not hardcoded** — keeps home page consistent with `/salon`'s existing seeded-score approach rather than introducing static fake names; discarded the template's literal hardcoded ticker rows.
- **Pricing/FAQ section ported as-is** — kept as static marketing content with no backend, even though no billing exists in the app; discarded the option of omitting it, to preserve template fidelity.
- **No new component files for home-only pieces** (`FloatingSilhouettes`, `MiniCard`, `useReveal`) — kept local to `app/page.tsx`, matching the template's single-file structure and avoiding premature abstraction since they're used nowhere else.
- **"VOLVER AL VAULT" treated as "back to library," not "back to home"** — both instances point to `/games`, discarding the alternative of pointing to `/`.

## Identified risks

- **No redirects for old `/juegos` URLs** — any external links or bookmarks to `/juegos/[id]` will 404 after this change; acceptable since the app has no production users yet, but worth noting.
- **CSS class collisions** — the template's `styles.css` and the app's `globals.css` were developed somewhat independently; porting `.home-*`/`.feature-card`/`.activity-card` rules could shadow or conflict with existing class names. Mitigation: diff class names before pasting, only add what's missing.
