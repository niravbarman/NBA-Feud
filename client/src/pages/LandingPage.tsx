// client/src/pages/LandingPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { teams } from "../teams";
import { ensureSessionHash } from "../session";

function generateSeasonLabelsFrom2000(): string[] {
  const earliestStartYear = 2000;
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0..11

  // Include most recent completed/current season window.
  let latestStart = y - 1;
  if (m >= 9) latestStart = y; // Oct–Dec
  else if (m <= 5) latestStart = y - 1; // Jan–Jun

  const labels: string[] = [];
  for (let start = latestStart; start >= earliestStartYear; start--) {
    const end2 = String((start + 1) % 100).padStart(2, "0");
    labels.push(`${start}-${end2}`);
  }
  return labels;
}

type Difficulty = "easy" | "medium" | "hard" | "impossible";

const LS_KEYS = {
  season: "game.season",
  teamId: "game.teamId",
  seasonType: "game.seasonType",
  difficulty: "game.difficulty",
};

function readNum(key: string, fallback: number) {
  const v = Number(localStorage.getItem(key));
  return Number.isFinite(v) ? v : fallback;
}
function readStr<T extends string>(key: string, fallback: T): T {
  const v = localStorage.getItem(key);
  return (v as T) ?? fallback;
}

// Medium and Hard are swapped in behavior mapping:
// - Easy: any order; GP/PPG visible
// - Medium: any order; GP/PPG hidden
// - Hard: fixed order; GP/PPG visible
// - Impossible: fixed order; GP/PPG hidden
function difficultyToSettings(d: Difficulty) {
  switch (d) {
    case "easy":
      return { hard: false, showGP: true, showPPG: true };
    case "medium":
      return { hard: false, showGP: false, showPPG: false };
    case "hard":
      return { hard: true, showGP: true, showPPG: true };
    case "impossible":
      return { hard: true, showGP: false, showPPG: false };
  }
}

export default function LandingPage() {
  const navigate = useNavigate();
  const seasonOptions = useMemo(() => generateSeasonLabelsFrom2000(), []);
  const defaultSeason = seasonOptions[0] || "2015-16";

  // Restore persisted basics
  const [season, setSeason] = useState<string>(readStr(LS_KEYS.season, defaultSeason));
  const [teamId, setTeamId] = useState<number>(readNum(LS_KEYS.teamId, teams[0]?.id ?? 1610612747));

  // Force Regular Season always
  const [seasonType, setSeasonType] = useState<string>("Regular Season");

  // Difficulty: Easy selected by default (first-time users). If a saved choice exists, use it.
  const [difficulty, setDifficulty] = useState<Difficulty>(() => {
    const saved = localStorage.getItem(LS_KEYS.difficulty) as Difficulty | null;
    return saved ?? "easy";
  });

  // Reveal/hide team and season selector on demand
  const [showTeamSelector, setShowTeamSelector] = useState<boolean>(false);

  // Ensure a session hash exists for this tab/session
  const [sessionHash, setSessionHash] = useState<string>("");
  useEffect(() => {
    setSessionHash(ensureSessionHash());
  }, []);

  // Validate persisted values against current options
  useEffect(() => {
    if (!seasonOptions.includes(season)) {
      setSeason(defaultSeason);
      localStorage.setItem(LS_KEYS.season, defaultSeason);
    }
    if (!teams.some((t) => t.id === teamId)) {
      const fallbackId = teams[0]?.id ?? 1610612747;
      setTeamId(fallbackId);
      localStorage.setItem(LS_KEYS.teamId, String(fallbackId));
    }

    // Always force Regular Season
    if (seasonType !== "Regular Season") {
      setSeasonType("Regular Season");
      localStorage.setItem(LS_KEYS.seasonType, "Regular Season");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonOptions.length]);

  // Persist on change
  useEffect(() => {
    localStorage.setItem(LS_KEYS.season, season);
  }, [season]);
  useEffect(() => {
    localStorage.setItem(LS_KEYS.teamId, String(teamId));
  }, [teamId]);
  useEffect(() => {
    localStorage.setItem(LS_KEYS.seasonType, seasonType);
  }, [seasonType]);
  useEffect(() => {
    localStorage.setItem(LS_KEYS.difficulty, difficulty);
  }, [difficulty]);

  function pickRandomTeamAndSeason() {
    const randTeam = teams[Math.floor(Math.random() * teams.length)];
    const randSeason = seasonOptions[Math.floor(Math.random() * seasonOptions.length)];
    return { randTeamId: randTeam.id, randSeason };
  }

  function startGame(withTeamId?: number, withSeason?: string) {
    const useTeamId = withTeamId ?? teamId;
    const useSeason = withSeason ?? season;

    const { hard, showGP, showPPG } = difficultyToSettings(difficulty);
    const params = new URLSearchParams({
      team_id: String(useTeamId),
      season: useSeason,
      season_type: "Regular Season",
      hard: hard ? "1" : "0",
      show_gp: showGP ? "1" : "0",
      show_ppg: showPPG ? "1" : "0",
    });
    // Persist difficulty explicitly before navigating
    localStorage.setItem(LS_KEYS.difficulty, difficulty);
    localStorage.setItem(LS_KEYS.seasonType, "Regular Season");

    // Include the session-bound hash fragment; Game page will gate access
    const hashFrag = sessionHash ? `#${sessionHash}` : "";
    navigate(`/game?${params.toString()}${hashFrag}`);
  }

  // Random Team: randomize both team and season, then start
  function randomTeamAndStart() {
    const { randTeamId, randSeason } = pickRandomTeamAndSeason();
    // Persist and reflect in UI state
    setTeamId(randTeamId);
    setSeason(randSeason);
    localStorage.setItem(LS_KEYS.teamId, String(randTeamId));
    localStorage.setItem(LS_KEYS.season, randSeason);

    // Navigate using the freshly picked values
    startGame(randTeamId, randSeason);
  }

  const buttonBase: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #333",
    background: "#fff",
    color: "#111",
    cursor: "pointer",
    minWidth: 140,
    fontWeight: 600,
  };
  const buttonPrimary: React.CSSProperties = {
    ...buttonBase,
    background: "#111",
    color: "#fff",
    borderColor: "#111",
  };

  function DifficultyButton({
    value,
    label,
  }: {
    value: Difficulty;
    label: string;
  }) {
    const active = difficulty === value;
    return (
      <button
        type="button"
        aria-pressed={active}
        onClick={() => setDifficulty(value)}
        style={active ? buttonPrimary : buttonBase}
      >
        {label}
      </button>
    );
  }

function renderRules() {
  let text = "";
  switch (difficulty) {
    case "easy":
      text = "Guess players in any order. Leaders will have their GP and PPG displayed.";
      break;
    case "medium":
      text = "Guess players in any order. Leaders will NOT have their GP and PPG displayed.";
      break;
    case "hard":
      // Mapped from your third line
      text =
        "You will be required to guess players from highest to lowest PPG in the exact correct order. Leaders will have their GP and PPG displayed.";
      break;
    case "impossible":
      // Mapped from your fourth line
      text =
        "You will be required to guess players from highest to lowest PPG in the exact correct order. Leaders will NOT have their GP and PPG displayed.";
      break;
  }
  return (
    <div
      style={{
        marginTop: 12,
        padding: "10px 12px",
        border: "1px solid #ddd",
        borderRadius: 8,
        background: "#fafafa",
        color: "#333",
        textAlign: "center",
      }}
    >
      {text}
    </div>
  );
}

  // Common centered select style
  const centeredSelectStyle: React.CSSProperties = {
    width: "100%",
    padding: 8,
    textAlign: "center",
    textAlignLast: "center" as any, // TS workaround for non-standard property
  };

  return (
    <div
      style={{
        maxWidth: 1000,
        margin: "0 auto",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: 16,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ marginBottom: 16 }}>Select Your Game</h1>

      {/* Welcome messages (team/season selectors hidden initially) */}
      <div
        style={{
          marginTop: 4,
          padding: "12px 14px",
          border: "1px solid #e6e6e6",
          borderRadius: 8,
          background: "#fafafa",
          color: "#222",
        }}
      >
        <p style={{ margin: 0, fontWeight: 700 }}>
          Welcome to NBA Feud! Do you think you can remember the top scorers on historic NBA teams? Test your knowledge
          here!
        </p>
        <p style={{ margin: "8px 0 0 0" }}>
          Pick a team from 2000 and on, and try to name each of their top 10 scorers from that season. Or, if you think
          you really know ball, select the randomizer and try your luck!
        </p>
      </div>

      <div style={{ marginTop: 24 }}>
        <h2 style={{ marginBottom: 8, fontSize: 18 }}>Difficulty</h2>
        <div style={{ color: "#666", marginBottom: 10 }}>Select a difficulty to reveal the rules</div>

        {/* Centered difficulty buttons */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <DifficultyButton value="easy" label="Easy" />
          <DifficultyButton value="medium" label="Medium" />
          <DifficultyButton value="hard" label="Hard" />
          <DifficultyButton value="impossible" label="Impossible" />
        </div>

        {renderRules()}
      </div>

      {/* Bottom action area */}
      <div style={{ marginTop: "clamp(24px, 15vh, 240px)" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          {/* Random Team is black (primary) */}
          <button
            type="button"
            onClick={randomTeamAndStart}
            style={{
              ...buttonPrimary,
              minWidth: 180,
              fontWeight: 700,
            }}
          >
            Random Team
          </button>

          {/* Select Team is white (base) */}
          <button
            type="button"
            onClick={() => setShowTeamSelector(true)}
            style={{
              ...buttonBase,
              minWidth: 180,
              fontWeight: 700,
            }}
          >
            Select Team
          </button>
        </div>

        {/* Revealed season + team selector with Start Game action */}
        {showTeamSelector && (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "1fr 1fr auto",
              gap: 12,
              alignItems: "end",
              maxWidth: 900,
              marginInline: "auto",
            }}
          >
            <div>
              <label style={{ display: "block", marginBottom: 6 }}>Season</label>
              <select value={season} onChange={(e) => setSeason(e.target.value)} style={centeredSelectStyle}>
                {seasonOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 6 }}>Team</label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(Number(e.target.value))}
                style={centeredSelectStyle}
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => startGame()}
                style={{
                  padding: "10px 16px",
                  fontSize: 16,
                  borderRadius: 8,
                  border: "1px solid #333",
                  background: "#111",
                  color: "white",
                  cursor: "pointer",
                  minWidth: 140,
                  fontWeight: 700,
                }}
              >
                Start Game
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ height: 24 }} />
    </div>
  );
}