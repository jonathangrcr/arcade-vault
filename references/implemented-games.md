# Implemented games

Games with a real, playable engine wired into `app/games/[id]/play/page.tsx`'s `GAME_COMPONENTS` registry, backed by a Supabase leaderboard. All other entries in `lib/games.ts`'s `GAMES` catalog are placeholders (they render the fake `.game-arena` filler and an auto-incrementing score, not a real game).

| id | Title | Category | Engine component | Spec |
|---|---|---|---|---|
| `asteroides` | ASTEROIDES | SHOOTER | `components/games/AsteroidsGame.tsx` | `specs/04-asteroids-game.md` |
| `tetris` | TETRIS | PUZZLE | `components/games/TetrisGame.tsx` | `specs/06-tetris-game.md` |
| `arkanoid` | ARKANOID | ARCADE | `components/games/ArkanoidGame.tsx` | `specs/07-arkanoid-game.md` |
