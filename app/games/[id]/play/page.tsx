"use client";

import { use, useEffect, useRef, useState, forwardRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { GAMES } from "@/lib/games";
import { useUser } from "@/lib/useUser";
import { insertScore } from "@/lib/supabase/scores";
import AsteroidsGame, {
  type AsteroidsGameHandle,
} from "@/components/games/AsteroidsGame";
import TetrisGame, {
  type TetrisGameHandle,
} from "@/components/games/TetrisGame";
import ArkanoidGame, {
  type ArkanoidGameHandle,
} from "@/components/games/ArkanoidGame";

type GameHandle = { restart: () => void };

type GameComponentProps = {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLevelChange: (level: number) => void;
  onLivesChange: (lives: number) => void;
  onGameOver: (finalScore: number) => void;
};

const AsteroidsEntry = forwardRef<GameHandle, GameComponentProps>(
  function AsteroidsEntry(props, ref) {
    return (
      <AsteroidsGame
        ref={ref as React.Ref<AsteroidsGameHandle>}
        paused={props.paused}
        onScoreChange={props.onScoreChange}
        onLivesChange={props.onLivesChange}
        onLevelChange={props.onLevelChange}
        onGameOver={props.onGameOver}
      />
    );
  },
);

const TetrisEntry = forwardRef<GameHandle, GameComponentProps>(
  function TetrisEntry(props, ref) {
    return (
      <TetrisGame
        ref={ref as React.Ref<TetrisGameHandle>}
        paused={props.paused}
        onScoreChange={props.onScoreChange}
        onLevelChange={props.onLevelChange}
        onGameOver={props.onGameOver}
      />
    );
  },
);

const ArkanoidEntry = forwardRef<GameHandle, GameComponentProps>(
  function ArkanoidEntry(props, ref) {
    return (
      <ArkanoidGame
        ref={ref as React.Ref<ArkanoidGameHandle>}
        paused={props.paused}
        onScoreChange={props.onScoreChange}
        onLivesChange={props.onLivesChange}
        onLevelChange={props.onLevelChange}
        onGameOver={props.onGameOver}
      />
    );
  },
);

const GAME_COMPONENTS: Record<
  string,
  { Component: typeof AsteroidsEntry; fixedLives?: number }
> = {
  asteroides: { Component: AsteroidsEntry },
  tetris: { Component: TetrisEntry, fixedLives: 1 },
  arkanoid: { Component: ArkanoidEntry },
};

export default function GamePlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const game = GAMES.find((g) => g.id === id);
  const entry = game ? GAME_COMPONENTS[game.id] : undefined;
  const router = useRouter();
  const { user } = useUser();
  const gameRef = useRef<GameHandle>(null);

  const [score, setScore] = useState(0);
  const [livesState, setLivesState] = useState(3);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [customName, setCustomName] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const lives = entry?.fixedLives ?? livesState;
  const displayLevel = entry ? level : Math.floor(score / 2500) + 1;
  const name = customName ?? user?.name ?? "INVITADO";

  useEffect(() => {
    if (entry || over || paused) return;
    const t = setInterval(
      () => setScore((s) => s + Math.floor(10 + Math.random() * 90)),
      220,
    );
    return () => clearInterval(t);
  }, [entry, over, paused]);

  if (!game) notFound();

  const endGame = () => {
    setOver(true);
    if (entry) setPaused(true);
  };
  const restart = () => {
    setScore(0);
    setLivesState(3);
    setLevel(1);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setSaveError(null);
    gameRef.current?.restart();
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await insertScore({ gameId: game.id, playerName: name, score });
      setSaved(true);
    } catch {
      setSaveError("NO SE PUDO GUARDAR. INTENTA DE NUEVO.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(displayLevel).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={() => setPaused((p) => !p)}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={endGame}>
            FIN
          </button>
          <Link href={`/games/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {entry ? (
            <entry.Component
              ref={gameRef}
              paused={paused}
              onScoreChange={setScore}
              onLevelChange={setLevel}
              onLivesChange={setLivesState}
              onGameOver={() => setOver(true)}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor" />
              <div className="enemy e1" />
              <div className="enemy e2" />
              <div className="enemy e3" />
              <div className="player-ship" />
            </div>
          )}
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setCustomName(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                  disabled={saving}
                />
                <button
                  className="btn yellow"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "GUARDANDO..." : "GUARDAR PUNTUACIÓN"}
                </button>
                {saveError && (
                  <div
                    className="toast-error"
                    style={{ color: "var(--magenta)" }}
                  >
                    {saveError}
                  </div>
                )}
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <button
                className="btn magenta"
                onClick={() => router.push("/games")}
              >
                VOLVER AL VAULT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
