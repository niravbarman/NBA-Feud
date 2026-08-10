// client/src/pages/LandingPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { teams } from "../teams";
import { getSessionHash } from "../session";

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

export default function LandingPage() {
  const navigate = useNavigate();

  const seasonOptions = useMemo(() => generateSeasonLabelsFrom2000(), []);
  const defaultSeason = seasonOptions[0] || "2015-16";

  const [season, setSeason] = useState<string>(localStorage.getItem(LS_KEYS.season) || defaultSeason);
  const [teamId, setTeamId] = useState<number>(
    Number(localStorage.getItem(LS_KEYS.teamId) || teams[0]?.id || 1610612747)
  );

  // Keep seasonType internally (default Regular Season). No UI picker.
  const [seasonType] = useState<string>(localStorage.getItem(LS_KEYS.seasonType) || "Regular Season");

  const [difficulty, setDifficulty] = useState<Difficulty>(
    (localStorage.getItem(LS_KEYS.difficulty) as Difficulty) || "easy"
  );
  const [showTeamSelector, setShowTeamSelector] = useState<boolean>(false);

  // Map difficulty to flags used by GamePage
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

  // Create an opaque, session-bound ticket and navigate with only the hash token in the URL
  async function startGame(withTeamId?: number) {
    const sessionHash = getSessionHash();
    const chosenTeamId = typeof withTeamId === "number" ? withTeamId : teamId;

    const ticket = {
      sessionHash,
      settings: {
        team_id: String(chosenTeamId),
        season,
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

    // Only the token (hash) is placed in the URL
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

  async function handleRandomTeam() {
    const newId = pickDifferentRandomTeam(teamId);
    setTeamId(newId);
    setShowTeamSelector(false);
    await startGame(newId);
  }

  // Layout
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
      </div>
    </div>
  );
}