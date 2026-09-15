"use client";

import { useEffect, useState } from "react";
import { getLeaderboard, ScoreRow } from "@/lib/supabase/scores";

export function LeaderboardPreview({ gameId }: { gameId: string }) {
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const loading = loadedId !== gameId;

  useEffect(() => {
    let cancelled = false;
    getLeaderboard(gameId, 10).then((data) => {
      if (!cancelled) {
        setRows(data);
        setLoadedId(gameId);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  return (
    <div className="leaderboard">
      <h3>MEJORES PUNTUACIONES</h3>
      {loading ? (
        <div
          className="pixel"
          style={{ textAlign: "center", padding: "24px 0" }}
        >
          CARGANDO...
        </div>
      ) : rows.length === 0 ? (
        <div
          className="pixel"
          style={{ textAlign: "center", padding: "24px 0" }}
        >
          SIN PUNTUACIONES AÚN — SÉ EL PRIMERO
        </div>
      ) : (
        rows.map((r, i) => (
          <div
            key={r.name}
            className={
              "lb-row" +
              (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
            }
          >
            <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
            <div className="pl">
              {r.name}
              <div
                style={{
                  fontSize: 10,
                  color: "var(--ink-faint)",
                  letterSpacing: "0.1em",
                }}
              >
                {r.date}
              </div>
            </div>
            <div className="sc">{r.score.toLocaleString("es-ES")}</div>
          </div>
        ))
      )}
    </div>
  );
}
