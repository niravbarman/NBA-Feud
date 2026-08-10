export interface TeamPPGPlayer {
  player_id: number;
  player_name: string;
  team_id: number;
  team_abbr: string;
  games_played: number;
  ppg: number;
}

export interface TeamPPGResponse {
  season: string;
  season_type: string;
  team_id: number;
  limit: number;
  min_games: number;
  players: TeamPPGPlayer[];
}

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

export async function getTeamPPG(
  teamId: number,
  season: string,
  limit = 10,
  seasonType = "Regular Season",
  minGames = 15
): Promise<TeamPPGResponse> {
  const url =
    `${API_BASE}/api/team-ppg` +
    `?team_id=${teamId}` +
    `&season=${encodeURIComponent(season)}` +
    `&season_type=${encodeURIComponent(seasonType)}` +
    `&limit=${limit}` +
    `&min_games=${minGames}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}