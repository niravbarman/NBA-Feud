// server/src/routes/stats.ts
import { Router } from "express";
import { getTeamPPG } from "../services/nbaStats";

export const statsRouter = Router();

type TeamPPGItem = {
  playerId: number;
  playerName: string;
  games: number;
  points: number;      // total points across counted games
  minutes?: number;    // optional if available
  ppg: number;         // points per game (rounded)
};

type TeamPPGResponse = {
  teamId: number;
  season: string;
  seasonType: string;
  minGames: number;
  limit: number;
  items: TeamPPGItem[]; // sorted desc by ppg
};

statsRouter.get("/team-ppg", async (req, res, next) => {
  try {
    const {
      team_id,
      season,
      season_type = "Regular Season",
      limit = "10",
      min_games = "15",
    } = req.query as Record<string, string>;

    if (!team_id || !season) {
      return res.status(400).json({
        error: "Missing required query parameters: team_id and season",
      });
    }

    const teamId = Number(team_id);
    const lim = Math.max(1, Number(limit));
    const minGames = Math.max(1, Number(min_games));

    if (!Number.isFinite(teamId) || !Number.isFinite(lim) || !Number.isFinite(minGames)) {
      return res.status(400).json({ error: "Invalid numeric parameters" });
    }

    const items = await getTeamPPG({
      teamId,
      season,
      seasonType: season_type,
      minGames,
      limit: lim,
    });

    const payload: TeamPPGResponse = {
      teamId,
      season,
      seasonType: season_type,
      minGames,
      limit: lim,
      items,
    };

    res.json(payload);
  } catch (err) {
    next(err);
  }
});