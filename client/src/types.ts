export interface Player {
  id: number;
  first_name: string;
  last_name: string;
  position: string;
  team: { id: number; full_name: string; abbreviation: string; city: string };
}

export interface PlayerStat {
  id: number;
  date: string;
  season: number;
  pts: number;
  reb: number;
  ast: number;
  blk: number;
  stl: number;
  min: string;
  team: string;
  opponent: string;
  home: boolean;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: { total_pages: number; current_page: number; next_page: number | null; per_page: number; total_count: number };
}

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
  players: TeamPPGPlayer[];
}