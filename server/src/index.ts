// server/src/index.ts
import express from "express";
import cors from "cors";
import { TTLCache } from "./cache";
import { fetchTeamPPGFromNBAStats } from "./services/nbaStats";

const app = express();

const PORT = Number(process.env.PORT ?? 4000);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;

// CORS: allow explicit frontend when provided; otherwise permissive for dev
app.use(
  cors({
    origin: FRONTEND_ORIGIN ? [FRONTEND_ORIGIN] : true,
    methods: ["GET", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept"],
    credentials: false,
  })
);

// Health
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// OPTIONAL: legacy alias for underscore path (keeps older clients working)
// Place this BEFORE the canonical handler.
app.get("/api/team_ppg", (req, res) => {
  const q = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  // 307 preserves method semantics if you ever support POST here
  res.redirect(307, `/api/team-ppg${q}`);
});

// Cache the full PPG result for a team/season for 24h; filter/slice per-request
const ppgCache = new TTLCache<any>(24 * 60 * 60 * 1000); // 24 hours

// Helpers to make parsing safe and predictable
function clampNumber(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
function parseOr<T extends number>(value: unknown, fallback: T): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

app.get("/api/team-ppg", async (req, res) => {
  try {
    // Parse with safe defaults and bounds
    const team_id_raw = req.query.team_id;
    const team_id = Number(team_id_raw);
    if (!Number.isFinite(team_id) || team_id <= 0) {
      return res.status(400).json({ error: "team_id is required and must be a positive number" });
    }

    const season = String(req.query.season ?? "2015-16");
    const season_type = String(req.query.season_type ?? "Regular Season");

    const limit = clampNumber(parseOr(req.query.limit, 10), 1, 50);
    const min_games = clampNumber(parseOr(req.query.min_games, 15), 0, 200);

    const cacheKey = `${team_id}:${season}:${season_type}:full`;
    let data = ppgCache.get(cacheKey) as
      | { season: string; season_type: string; team_id: number; players: any[] }
      | undefined;

    if (!data) {
      const players = await fetchTeamPPGFromNBAStats(team_id, season, season_type);
      data = { season, season_type, team_id, players };
      ppgCache.set(cacheKey, data);
    }

    // Normalize fields so sorting/filtering is deterministic
    const normalized = (data.players ?? []).map((p: any) => {
      const games =
        Number(p.games_played ?? p.GP ?? p.games ?? 0);
      const points =
        Number(p.points ?? p.PTS ?? 0);
      const ppgField =
        Number(p.ppg ?? p.PPG ?? p.points_per_game ?? p.PTS_PER ?? NaN);
      const ppg = Number.isFinite(ppgField)
        ? ppgField
        : games > 0
          ? Number((points / games).toFixed(2))
          : 0;

      return {
        ...p,
        GP: games,
        PPG: ppg,
      };
    });

    // Filter and sort: top scorers first, then by games played
    const filtered = normalized
      .filter((p: any) => Number(p.GP) >= min_games)
      .sort((a: any, b: any) => {
        if (b.PPG !== a.PPG) return b.PPG - a.PPG;
        if (b.GP !== a.GP) return b.GP - a.GP;
        return String(a.player_name ?? a.Player ?? "").localeCompare(String(b.player_name ?? b.Player ?? ""));
      });

    const players = filtered.slice(0, limit);

    // Optional client-side caching hint (adjust or remove as needed)
    // res.setHeader("Cache-Control", "public, max-age=300");

    res.json({
      season,
      season_type,
      team_id,
      limit,
      min_games,
      players,
    });
  } catch (e: any) {
    console.error("team-ppg error:", e?.stack || e);
    res.status(500).json({ error: e?.message || "Failed to fetch Team PPG" });
  }
});

// Note: Player search and final-day roster features were removed per your request.

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  if (FRONTEND_ORIGIN) {
    console.log(`CORS allowed origin: ${FRONTEND_ORIGIN}`);
  } else {
    console.log("CORS: permissive (development)");
  }
});