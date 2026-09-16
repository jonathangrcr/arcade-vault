import { createClient } from "@/lib/supabase/client";

export type ScoreRow = {
  rank: number;
  name: string;
  score: number;
  date: string; // DD/MM/YYYY
};

type LeaderboardRpcRow = {
  player_name: string;
  score: number;
  created_at: string;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

export async function getLeaderboard(
  gameId: string,
  limit = 12,
): Promise<ScoreRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_leaderboard", {
    p_game_id: gameId,
    p_limit: limit,
  });

  if (error) throw error;

  return (data ?? []).map((row: LeaderboardRpcRow, i: number) => ({
    rank: i + 1,
    name: row.player_name,
    score: row.score,
    date: formatDate(row.created_at),
  }));
}

export async function getPlayerBest(
  gameId: string,
  playerName: string,
): Promise<ScoreRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_leaderboard", {
    p_game_id: gameId,
    p_limit: 2147483647,
  });

  if (error) throw error;

  const rows: LeaderboardRpcRow[] = data ?? [];
  const idx = rows.findIndex((row) => row.player_name === playerName);
  if (idx === -1) return null;

  return {
    rank: idx + 1,
    name: rows[idx].player_name,
    score: rows[idx].score,
    date: formatDate(rows[idx].created_at),
  };
}

export async function insertScore(entry: {
  gameId: string;
  playerName: string;
  score: number;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("scores").insert({
    game_id: entry.gameId,
    player_name: entry.playerName,
    score: entry.score,
  });

  if (error) throw error;
}
