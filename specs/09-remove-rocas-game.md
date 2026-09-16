# 09 — Remove Rocas Game

- **State:** Implemented
- **Dependencies:** None (rocas has 0 scores; no other spec references it as a live dependency)
- **Date:** 2026-09-16
- **Objective:** Remove the unused "rocas" placeholder game card and all its traces (catalog entry, cover art, DB row, stray screenshot) now that it's superseded by the real "asteroides" game.

## Scope

**In:**

- Remove the `"rocas"` object from the `GAMES` array in `lib/games.ts`.
- Remove `.cover-rocas` (and its `::before`/`::after` pseudo-elements) from `app/globals.css`.
- Add a new Supabase migration that `DELETE`s the `"rocas"` row from the `games` table.
- Delete the stray `.playwright-screenshots/rocas-play-unchanged.png` file.

**Not in:**

- No changes to the `"asteroides"` game, its catalog entry, or its cover art — it stays exactly as-is.
- No changes to `app/games/[id]/page.tsx`, `app/games/[id]/play/page.tsx`, or any routing/registry logic — since `"rocas"` was never wired into the play-page registry, removing it from `GAMES` and the DB is sufficient for `/games/rocas` and `/games/rocas/play` to 404 naturally.
- No redirect from old `/games/rocas` URLs.
- No changes to the `scores` table (0 rows reference `rocas`, so nothing to clean up there).

## Data model

No new data structures are introduced — this spec only removes an existing catalog entry, CSS rule, and DB row. Skipping this section.

## Implementation plan

1. **Remove catalog entry**: delete the `"rocas"` object from the `GAMES` array in `lib/games.ts`.
2. **Remove cover art**: delete the `.cover-rocas`, `.cover-rocas::after`, and `.cover-rocas::before` rules from `app/globals.css`.
3. **Delete stray screenshot**: remove `.playwright-screenshots/rocas-play-unchanged.png`.
4. **Add DB migration**: create and apply a new Supabase migration (e.g. `remove_rocas_game`) that runs `DELETE FROM games WHERE id = 'rocas';`.
5. **Verify**: run `npm run lint`, confirm the catalog page no longer shows ROCAS, and confirm `/games/rocas` and `/games/rocas/play` return 404.

## Acceptance criteria

- [ ] `lib/games.ts` no longer contains a `"rocas"` entry in the `GAMES` array.
- [ ] `app/globals.css` no longer contains any `.cover-rocas` rules.
- [ ] `.playwright-screenshots/rocas-play-unchanged.png` no longer exists in the repo.
- [ ] A new migration exists that deletes the `"rocas"` row from the `games` table, and after applying it, `SELECT * FROM games WHERE id = 'rocas'` returns 0 rows.
- [ ] Visiting `/games/rocas` and `/games/rocas/play` returns a 404.
- [ ] The catalog page (`/games`) and salon/leaderboard page no longer list or reference ROCAS.
- [ ] `npm run lint` passes with no new errors.
- [ ] `npm run build` completes successfully.

## Decisions taken and discarded

- **Full removal instead of leaving the catalog entry as an unreachable/hidden card** — user's explicit request ("it is no longer needed"); "rocas" is a never-implemented placeholder now fully redundant with the real "asteroides" game.
- **404 instead of a redirect from old `/games/rocas` URLs** — user's choice; no external links or bookmarks are expected to depend on this placeholder's URL, so a redirect isn't worth the added routing logic.
- **DB row deletion via migration instead of leaving a stale row** — confirmed safe since `SELECT count(*) FROM scores WHERE game_id = 'rocas'` returned 0; no leaderboard data is lost.
- **No changes to `"asteroides"`** — it's the actual implemented game and fully unrelated to this cleanup; spec 04 already documented that `"rocas"` and `"asteroides"` were kept as separate, independent entries.
