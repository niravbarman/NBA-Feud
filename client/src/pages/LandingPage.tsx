import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { teams } from "../teams";
import { getSessionHash } from "../session";
import { db, ensureUser } from "../lib/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

type Difficulty = "easy" | "medium" | "hard" | "impossible";

const LS_KEYS = {
  season: "game.season",
  teamId: "game.teamId",
  seasonType: "game.seasonType",
  hard: "game.hard",
  showGP: "game.showGP",
  showPPG: "game.showPPG",
  difficulty: "game.difficulty",
};

function generateSeasonLabelsFrom2000(): string[] {
  const earliestStartYear = 2000;
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0..11

  // Default to the latest completed season; if we're in Oct (9) or later, include the current season start
  let latestStart = y - 1;
  if (m >= 9) latestStart = y;
  else if (m <= 5) latestStart = y - 1;

  const labels: string[] = [];
  for (let start = latestStart; start >= earliestStartYear; start--) {
    const end2 = String((start + 1) % 100).padStart(2, "0");
    labels.push(`${start}-${end2}`);
  }
  return labels;
}

function randomId(bytes = 8): string {
  const arr = new Uint8Array(bytes);
  window.crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type ScoreRow = {
  id: string;
  teamId: number;
  teamName: string;
  season: string;
  seasonType: string;
  firstAttemptScore: number;
  highScore: number;
  attempts?: number;
};

export default function LandingPage() {
  const navigate = useNavigate();

  const seasonOptions = useMemo(() => generateSeasonLabelsFrom2000(), []);
  const defaultSeason = seasonOptions[0] || "2015-16";

  const [season, setSeason] = useState<string>(localStorage.getItem(LS_KEYS.season) || defaultSeason);
  const [teamId, setTeamId] = useState<number>(
    Number(localStorage.getItem(LS_KEYS.teamId) || teams[0]?.id || 1610612747)
  );

  const [seasonType] = useState<string>(localStorage.getItem(LS_KEYS.seasonType) || "Regular Season");

  const [difficulty, setDifficulty] = useState<Difficulty>(
    (localStorage.getItem(LS_KEYS.difficulty) as Difficulty) || "easy"
  );
  const [showTeamSelector, setShowTeamSelector] = useState<boolean>(false);

  const fixedOrder = difficulty === "hard" || difficulty === "impossible";
  const showGP = difficulty === "easy" || difficulty === "hard";
  const showPPG = difficulty === "easy" || difficulty === "hard";

  useEffect(() => {
    localStorage.setItem(LS_KEYS.season, season);
    localStorage.setItem(LS_KEYS.teamId, String(teamId));
    localStorage.setItem(LS_KEYS.seasonType, seasonType);
    localStorage.setItem(LS_KEYS.difficulty, difficulty);
    localStorage.setItem(LS_KEYS.hard, fixedOrder ? "1" : "0");
    localStorage.setItem(LS_KEYS.showGP, showGP ? "1" : "0");
    localStorage.setItem(LS_KEYS.showPPG, showPPG ? "1" : "0");
  }, [season, teamId, seasonType, difficulty, fixedOrder, showGP, showPPG]);

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
        text =
          "You will be required to guess players from highest to lowest PPG in the exact correct order. Leaders will have their GP and PPG displayed.";
        break;
      case "impossible":
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

  async function startGame(withTeamId?: number, withSeason?: string) {
    const sessionHash = getSessionHash();
    const chosenTeamId = typeof withTeamId === "number" ? withTeamId : teamId;
    const chosenSeason = typeof withSeason === "string" ? withSeason : season;

    const ticket = {
      sessionHash,
      settings: {
        team_id: String(chosenTeamId),
        season: chosenSeason,
        season_type: seasonType,
        hard: fixedOrder ? "1" : "0",
        show_gp: showGP ? "1" : "0",
        show_ppg: showPPG ? "1" : "0",
      },
      createdAt: Date.now(),
      nonce: randomId(8),
    };

    const token = `${sessionHash}-${ticket.nonce}`;
    sessionStorage.setItem(`game.ticket.${token}`, JSON.stringify(ticket));

    navigate(`/game#${token}`);
  }

  function pickDifferentRandomTeam(currentId: number): number {
    if (teams.length <= 1) return currentId;
    let idx = Math.floor(Math.random() * teams.length);
    let candidate = teams[idx].id;
    if (candidate === currentId) {
      idx = (idx + 1) % teams.length;
      candidate = teams[idx].id;
    }
    return candidate;
  }

  function pickDifferentRandomSeason(currentSeason: string): string {
    if (seasonOptions.length <= 1) return currentSeason;
    let idx = Math.floor(Math.random() * seasonOptions.length);
    let candidate = seasonOptions[idx];
    if (candidate === currentSeason) {
      idx = (idx + 1) % seasonOptions.length;
      candidate = seasonOptions[idx];
    }
    return candidate;
  }

  async function handleRandomTeam() {
    const newId = pickDifferentRandomTeam(teamId);
    const newSeason = pickDifferentRandomSeason(season);
    setTeamId(newId);
    setSeason(newSeason);
    setShowTeamSelector(false);
    await startGame(newId, newSeason);
  }

  const container: React.CSSProperties = {
    maxWidth: 1100,
    margin: "0 auto",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    padding: 16,
    fontFamily: "system-ui, sans-serif",
  };

  const contentStack: React.CSSProperties = {
    maxWidth: 900,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  };

  const buttonBase: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #333",
    background: "#fff",
    color: "#111",
    cursor: "pointer",
    fontWeight: 600,
  };

  const buttonPrimary: React.CSSProperties = {
    ...buttonBase,
    background: "#111",
    color: "#fff",
    borderColor: "#111",
  };

  const centeredSelectStyle: React.CSSProperties = {
    width: "100%",
    padding: 8,
    textAlign: "center",
    textAlignLast: "center" as any,
    boxSizing: "border-box",
  };

  function DifficultyButton({
    value,
    label,
    sub,
  }: {
    value: Difficulty;
    label: string;
    sub?: string;
  }) {
    const active = difficulty === value;
    return (
      <button
        type="button"
        onClick={() => setDifficulty(value)}
        style={{
          ...buttonBase,
          padding: "12px 14px",
          borderColor: active ? "#111" : "#bbb",
          background: active ? "#111" : "#fff",
          color: active ? "#fff" : "#111",
          minWidth: 160,
        }}
        aria-pressed={active}
      >
        <div style={{ fontWeight: 700 }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: active ? "#eaeaea" : "#666" }}>{sub}</div>}
      </button>
    );
  }

  const [scoreRows, setScoreRows] = useState<ScoreRow[] | null>(null);
  const [scoreboardError, setScoreboardError] = useState<string | null>(null);
  const [scoreboardLoading, setScoreboardLoading] = useState<boolean>(true);

  useEffect(() => {
    let unsub: undefined | (() => void);
    let cancelled = false;

    (async () => {
      try {
        const uid = await ensureUser();
        const q = query(collection(db, "users", uid, "scores"), orderBy("highScore", "desc"));
        unsub = onSnapshot(
          q,
          (snap) => {
            if (cancelled) return;
            const rows: ScoreRow[] = snap.docs.map((d) => {
              const data = d.data() as any;
              const fallbackTeamName =
                teams.find((t) => Number(t.id) === Number(data.teamId))?.name || "Team";
              return {
                id: d.id,
                teamId: Number(data.teamId) || 0,
                teamName: String(data.teamName || fallbackTeamName),
                season: String(data.season || ""),
                seasonType: String(data.seasonType || ""),
                firstAttemptScore: Number(data.firstAttemptScore || 0),
                highScore: Number(data.highScore || 0),
                attempts: Number(data.attempts || 0),
              };
            });
            setScoreRows(rows);
            setScoreboardLoading(false);
            setScoreboardError(null);
          },
          (err) => {
            setScoreboardError(err?.message || "Failed to load scores.");
            setScoreboardLoading(false);
          }
        );
      } catch (e: any) {
        setScoreboardError(e?.message || "Failed to initialize scores.");
        setScoreboardLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, []);

  return (
    <div style={container}>
      <style>
        {`
          .selectors-grid {
            display: grid;
            grid-template-columns: 1fr 1fr auto;
            gap: 12px;
            align-items: end;
            max-width: 900px;
            margin-inline: auto;
          }
          @media (max-width: 800px) {
            .selectors-grid {
              grid-template-columns: 1fr;
              align-items: stretch;
            }
            .selectors-grid .start-button-wrap {
              justify-content: stretch !important;
            }
            .selectors-grid .start-button-wrap button {
              width: 100%;
            }
          }
          .page-title {
            text-align: center;
            margin: 4px 0 8px;
          }
        `}
      </style>

      {/* Page title */}
      <div className="page-title">
        <h1 style={{ margin: 0 }}>NBA Feud</h1>
      </div>

      <div style={contentStack}>
        {/* Welcome messages (team/season selectors hidden initially) */}
        <div
          style={{
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

        {/* Difficulty section */}
        <div
          style={{
            border: "1px solid #e6e6e6",
            borderRadius: 10,
            padding: 16,
            background: "#fafafa",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <DifficultyButton value="easy" label="Easy" />
            <DifficultyButton value="medium" label="Medium" />
            <DifficultyButton value="hard" label="Hard" />
            <DifficultyButton value="impossible" label="Impossible" />
          </div>
          {renderRules()}
        </div>

        {/* Actions + selectors */}
        <div>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <button type="button" onClick={handleRandomTeam} style={{ ...buttonPrimary, minWidth: 180 }}>
              Random Team
            </button>

            <button
              type="button"
              onClick={() => setShowTeamSelector((s) => !s)}
              style={{ ...buttonBase, minWidth: 180 }}
            >
              {showTeamSelector ? "Hide Selector" : "Select Team"}
            </button>
          </div>

          {showTeamSelector && (
            <div className="selectors-grid" style={{ marginTop: 16 }}>
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

              <div className="start-button-wrap" style={{ display: "flex", justifyContent: "flex-end" }}>
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

        <div style={{ height: 8 }} />

        {/* Scoreboard */}
        <div
          style={{
            border: "1px solid #e6e6e6",
            borderRadius: 10,
            padding: 16,
            background: "#fafafa",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Your Scoreboard</h2>
          </div>

          {scoreboardLoading ? (
            <div style={{ color: "#666" }}>Loading scores…</div>
          ) : scoreboardError ? (
            <div style={{ color: "#b00020" }}>{scoreboardError}</div>
          ) : !scoreRows || scoreRows.length === 0 ? (
            <div style={{ color: "#666" }}>No games played yet. Start a game to see your scores here.</div>
          ) : (
            <div style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" as any }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "8px" }}>Team</th>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "8px" }}>Season</th>
                    <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: "8px" }}>First Score</th>
                    <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: "8px" }}>High Score</th>
                  </tr>
                </thead>
                <tbody>
                  {scoreRows.map((r) => (
                    <tr key={r.id}>
                      <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>{r.teamName}</td>
                      <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                        {r.season}
                        {r.seasonType ? ` (${r.seasonType})` : ""}
                      </td>
                      <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0", textAlign: "right" }}>
                        {r.firstAttemptScore}
                      </td>
                      <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0", textAlign: "right" }}>
                        {r.highScore}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}