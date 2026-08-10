export interface TeamPPGPlayer {
  player_id: number;
  player_name: string;
  team_id: number;
  team_abbr: string;
  games_played: number;
  ppg: number;
}

const PLAYER_DASH = "https://stats.nba.com/stats/leaguedashplayerstats";
const TEAM_PLAYERS_DASH = "https://stats.nba.com/stats/leaguedashteamplayers";

function rowsToObjects<T = any>(headers: string[], rows: any[][]): T[] {
  return rows.map((row) => {
    const obj: any = {};
    headers.forEach((h, i) => (obj[h] = row[i]));
    return obj as T;
  });
}

function buildHeaders(season: string, teamId: number): Record<string, string> {
  return {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    Origin: "https://www.nba.com",
    Referer: `https://www.nba.com/stats/players/traditional/?Season=${encodeURIComponent(
      season
    )}&SeasonType=Regular%20Season&TeamID=${teamId}`,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "x-nba-stats-origin": "stats",
    "x-nba-stats-token": "true",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",
  };
}

async function fetchWithRetry(url: string, headers: Record<string, string>, tries = 3): Promise<Response> {
  let lastErr: any;
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers });
      if (res.ok) return res;

      const text = await res.text();
      const snippet = text.slice(0, 300);
      console.warn(`NBA Stats non-200 (attempt ${i}): ${res.status} — ${snippet}`);

      if (res.status === 403 || res.status === 404 || res.status === 429 || res.status >= 500) {
        const backoff = 500 * i + Math.floor(Math.random() * 300);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      throw new Error(`NBA Stats error ${res.status}: ${snippet}`);
    } catch (e: any) {
      lastErr = e;
      const backoff = 500 * i + Math.floor(Math.random() * 300);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw lastErr ?? new Error("NBA Stats request failed");
}

function buildPlayerDashParams(teamId: number, season: string, seasonType: string) {
  return new URLSearchParams({
    College: "",
    Conference: "",
    Country: "",
    DateFrom: "",
    DateTo: "",
    Division: "",
    DraftPick: "",
    DraftYear: "",
    GameScope: "",
    GameSegment: "",
    Height: "",
    LastNGames: "0",
    LeagueID: "00",
    Location: "",
    MeasureType: "Base",
    Month: "0",
    OpponentTeamID: "0",
    Outcome: "",
    PaceAdjust: "N",
    PerMode: "PerGame",
    Period: "0",
    PlayerExperience: "",
    PlayerPosition: "",
    PlusMinus: "N",
    Rank: "N",
    Season: season,
    SeasonSegment: "",
    SeasonType: seasonType,
    ShotClockRange: "",
    StarterBench: "",
    TeamID: String(teamId),
    TwoWay: "0",
    VsConference: "",
    VsDivision: "",
    Weight: "",
  });
}

function buildTeamPlayersDashParams(teamId: number, season: string, seasonType: string) {
  return new URLSearchParams({
    Season: season,
    SeasonType: seasonType,
    PerMode: "PerGame",
    MeasureType: "Base",
    TeamID: String(teamId),
    LeagueID: "00",
    PaceAdjust: "N",
    PlusMinus: "N",
    Rank: "N",
    Outcome: "",
    Location: "",
    Month: "0",
    SeasonSegment: "",
    DateFrom: "",
    DateTo: "",
    OpponentTeamID: "0",
    VsConference: "",
    VsDivision: "",
    GameSegment: "",
    Period: "0",
    LastNGames: "0",
    GameScope: "",
    PlayerExperience: "",
    PlayerPosition: "",
    StarterBench: "",
    TwoWay: "0",
    DraftYear: "",
    DraftPick: "",
    College: "",
    Country: "",
    Height: "",
    Weight: "",
    PORound: "0",
    ShotClockRange: "",
  });
}

function parsePlayers(json: any): TeamPPGPlayer[] {
  const rs = json.resultSets?.[0] || json.resultSet;
  if (!rs) throw new Error("Unexpected NBA Stats response shape");
  const rows = rowsToObjects<any>(rs.headers, rs.rowSet || []);
  const players: TeamPPGPlayer[] = rows.map((r: any) => ({
    player_id: Number(r.PLAYER_ID),
    player_name: String(r.PLAYER_NAME),
    team_id: Number(r.TEAM_ID),
    team_abbr: String(r.TEAM_ABBREVIATION),
    games_played: Number(r.GP),
    ppg: Number(r.PTS),
  }));
  players.sort((a, b) => b.ppg - a.ppg);
  return players;
}

export async function fetchTeamPPGFromNBAStats(
  teamId: number,
  season: string,
  seasonType: string = "Regular Season"
): Promise<TeamPPGPlayer[]> {
  const headers = buildHeaders(season, teamId);

  // Prefer player dash; fallback to team-players dash if needed
  const u1 = `${PLAYER_DASH}?${buildPlayerDashParams(teamId, season, seasonType).toString()}`;
  const r1 = await fetchWithRetry(u1, headers, 3);
  if (r1.ok) {
    const j1 = await r1.json();
    return parsePlayers(j1);
  }

  const u2 = `${TEAM_PLAYERS_DASH}?${buildTeamPlayersDashParams(teamId, season, seasonType).toString()}`;
  const r2 = await fetchWithRetry(u2, headers, 3);
  const j2 = await r2.json();
  return parsePlayers(j2);
}