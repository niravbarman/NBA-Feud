export interface Player {
  id: number;
  first_name: string;
  last_name: string;
  position: string;
  team: {
    id: number;
    full_name: string;
    abbreviation: string;
    city: string;
  };
}

export interface Game {
  id: number;
  date: string; // ISO
  season: number;
  home_team: { id: number; full_name: string; abbreviation: string };
  visitor_team: { id: number; full_name: string; abbreviation: string };
  home_team_score: number;
  visitor_team_score: number;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: { total_pages: number; current_page: number; next_page: number | null; per_page: number; total_count: number };
}