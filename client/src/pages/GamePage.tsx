// client/src/pages/GamePage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getTeamPPG, TeamPPGPlayer } from "../api";
import { teams } from "../teams";
import { getSessionHash } from "../session";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

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

type RevealMap = Record<number, boolean>;
type GuessMap = Record<number, string>;

const LS_KEYS = {
  season: "game.season",
  teamId: "game.teamId",
  seasonType: "game.seasonType",
  hard: "game.hard",
  showGP: "game.showGP",
  showPPG: "game.showPPG",
  difficulty: "game.difficulty",
};

const TOTAL_LIVES = 5;

function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function GamePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const q = useQuery();

  // Guard: must have a session hash in the URL that matches this session
  const urlHash = (location.hash || "").replace(/^#/, "");
  const sessionHash = getSessionHash();
  useEffect(() => {
    if (!sessionHash || !urlHash || urlHash !== sessionHash) {
      navigate("/", { replace: true });
    }
  }, [navigate, sessionHash, urlHash]);

  // Parse query params with fallbacks
  const seasonOptions = useMemo(() => generateSeasonLabelsFrom2000(), []);
  const defaultSeason = seasonOptions[0] || "2015-16";
  const season = q.get("season") || defaultSeason;
  const teamId = Number(q.get("team_id") || teams[0]?.id || 1610612747);
  const seasonType = q.get("season_type") || "Regular Season";
  // In this app, "hardMode" flag represents "fixed order"
  const fixedOrder = (q.get("hard") || "0") === "1";
  const showGP = (q.get("show_gp") || "0") === "1";
  const showPPG = (q.get("show_ppg") || "0") === "1";

  // Persist current settings so Back restores them on the Landing page
  useEffect(() => {
    localStorage.setItem(LS_KEYS.season, season);
    localStorage.setItem(LS_KEYS.teamId, String(teamId));
    localStorage.setItem(LS_KEYS.seasonType, seasonType);
    localStorage.setItem(LS_KEYS.hard, fixedOrder ? "1" : "0");
    localStorage.setItem(LS_KEYS.showGP, showGP ? "1" : "0");
    localStorage.setItem(LS_KEYS.showPPG, showPPG ? "1" : "0");

    // Difficulty inference with swapped Medium/Hard roles:
    // - Easy: any order; GP/PPG visible
    // - Medium: any order; GP/PPG hidden
    // - Hard: fixed order; GP/PPG visible
    // - Impossible: fixed order; GP/PPG hidden
    let inferred: "easy" | "medium" | "hard" | "impossible" = "medium";
    if (showGP && showPPG && !fixedOrder) inferred = "easy";
    else if (!showGP && !showPPG && !fixedOrder) inferred = "medium";
    else if (showGP && showPPG && fixedOrder) inferred = "hard";
    else if (!showGP && !showPPG && fixedOrder) inferred = "impossible";
    localStorage.setItem(LS_KEYS.difficulty, inferred);
  }, [season, teamId, seasonType, fixedOrder, showGP, showPPG]);

  // Validate core params; if missing, send back to landing
  useEffect(() => {
    if (!season || !teamId) {
      navigate("/", { replace: true });
    }
  }, [season, teamId, navigate]);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState<TeamPPGPlayer[]>([]);
  const [revealed, setRevealed] = useState<RevealMap>({});
  const [guesses, setGuesses] = useState<GuessMap>({});
  const [lives, setLives] = useState<number>(TOTAL_LIVES);
  const [score, setScore] = useState<number>(0);

  // Any-order mode: one global input and message + attempted-name tracking
  const [globalGuess, setGlobalGuess] = useState<string>("");
  const [globalMessage, setGlobalMessage] = useState<string>("");
  const [attemptedNames, setAttemptedNames] = useState<Set<string>>(new Set());

  // Shake states
  const [shakingRowId, setShakingRowId] = useState<number | null>(null);
  const [shakeGlobal, setShakeGlobal] = useState<boolean>(false);

  useEffect(() => {
    let cancel = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Server: top-10 and min 15 GP enforced
        const data = await getTeamPPG(teamId, season, 10, seasonType, 15);
        if (!cancel) {
          const fetched = (data.players || []).slice(0, 10);
          setPlayers(fetched);
          setRevealed({});
          setGuesses({});
          setLives(TOTAL_LIVES);
          setScore(0);
          setGlobalGuess("");
          setGlobalMessage("");
          setAttemptedNames(new Set());
          setShakingRowId(null);
          setShakeGlobal(false);
        }
      } catch (e: any) {
        if (!cancel) setError(e?.message || "Failed to fetch");
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    load();
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, season, seasonType]);

  function setGuess(playerId: number, value: string) {
    setGuesses((prev) => ({ ...prev, [playerId]: value }));
  }

  function revealAll() {
    const all: RevealMap = {};
    players.forEach((p) => (all[p.player_id] = true));
    setRevealed(all);
  }

  const nextIndexToReveal = useMemo(() => {
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (!revealed[p.player_id]) return i;
    }
    return -1; // all revealed
  }, [players, revealed]);

  const allRevealed = useMemo(
    () => players.length > 0 && players.every((p) => revealed[p.player_id]),
    [players, revealed]
  );

  // If lives run out, reveal all answers automatically
  useEffect(() => {
    if (lives === 0 && !allRevealed) {
      revealAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lives]);

  function giveUp() {
    if (lives === 0 || allRevealed) return;
    const ok = window.confirm("Are you sure you want to give up? This will reveal all answers.");
    if (ok) {
      setLives(0);
      revealAll();
    }
  }

  // Fixed-order mode: per-row submission (active row only)
  function submitGuess(playerId: number) {
    const row = players.find((p) => p.player_id === playerId);
    if (!row) return;
    if (revealed[playerId]) return;

    const guess = (guesses[playerId] || "").trim();
    const isActiveRow = fixedOrder && nextIndexToReveal !== -1 && players[nextIndexToReveal]?.player_id === playerId;

    if (lives <= 0 || !isActiveRow || guess === "" || allRevealed) return;

    const right = normalizeName(guess) === normalizeName(row.player_name);

    if (right) {
      setRevealed((prev) => ({ ...prev, [playerId]: true }));
      setScore((s) => s + 10);
      setGuesses((prev) => ({ ...prev, [playerId]: "" }));
    } else {
      setLives((l) => Math.max(0, l - 1));
      // Trigger shake on this row's input
      setShakingRowId(playerId);
      window.setTimeout(() => {
        setShakingRowId((curr) => (curr === playerId ? null : curr));
      }, 400);
    }
  }

  // Any-order mode: single input submission
  function submitGlobalGuessHandler() {
    if (fixedOrder || lives === 0 || allRevealed) return;
    const raw = globalGuess.trim();
    if (!raw) return;

    const key = normalizeName(raw);
    // If already attempted (correct or incorrect), do not penalize or reward
    if (attemptedNames.has(key)) {
      setGlobalMessage("Already guessed that name.");
      setGlobalGuess("");
      return;
    }

    // Mark as attempted
    setAttemptedNames((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });

    // Try to find a matching unrevealed player
    const match = players.find((p) => normalizeName(p.player_name) === key);

    if (match) {
      if (!revealed[match.player_id]) {
        setRevealed((prev) => ({ ...prev, [match.player_id]: true }));
        setScore((s) => s + 10);
        setGlobalMessage("Correct!");
      } else {
        setGlobalMessage("Already guessed that name.");
      }
    } else {
      // New incorrect attempt: lose one life and shake input
      setLives((l) => Math.max(0, l - 1));
      setGlobalMessage("Incorrect.");
      setShakeGlobal(true);
      window.setTimeout(() => setShakeGlobal(false), 400);
    }

    setGlobalGuess("");
  }

  const teamName = useMemo(() => teams.find((t) => t.id === teamId)?.name || "Team", [teamId]);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 16, fontFamily: "system-ui, sans-serif" }}>
      {/* Inline CSS for shake animation */}
      <style>
        {`
          @keyframes ely-shake {
            0% { transform: translateX(0); }
            15% { transform: translateX(-6px); }
            30% { transform: translateX(6px); }
            45% { transform: translateX(-5px); }
            60% { transform: translateX(5px); }
            75% { transform: translateX(-3px); }
            90% { transform: translateX(3px); }
            100% { transform: translateX(0); }
          }
          .shake {
            animation: ely-shake 350ms ease-in-out;
          }
        `}
      </style>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>
          {teamName} — {season} ({seasonType})
        </h1>
        <button onClick={() => navigate(-1)} style={{ padding: "6px 10px" }}>
          Back
        </button>
      </div>

      {/* Lives and Score */}
      <div style={{ marginTop: 8, marginBottom: 8, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "#333", fontWeight: 600 }}>Lives:</span>
          <div style={{ display: "flex", gap: 10 }}>
            {Array.from({ length: TOTAL_LIVES }).map((_, i) => {
              const isActive = i < lives;
              return (
                <span
                  key={i}
                  aria-label={isActive ? "life remaining" : "life lost"}
                  title={isActive ? "Life remaining" : "Life lost"}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "#111",
                    opacity: isActive ? 1 : 0.22,
                    border: "1px solid rgba(0,0,0,0.5)",
                    boxShadow: isActive ? "0 1px 2px rgba(0,0,0,0.25)" : "inset 0 0 0 1px rgba(0,0,0,0.35)",
                    display: "inline-block",
                  }}
                />
              );
            })}
          </div>
        </div>
        <div style={{ color: "#333", fontWeight: 600 }}>
          Score: <span style={{ fontWeight: 700 }}>{score}</span>
        </div>
      </div>

      <div style={{ color: "#666", marginTop: 6, marginBottom: 16 }}>
        Game settings: {fixedOrder ? "Fixed order" : "Any order"}, {showGP ? "Show GP" : "Hide GP"},{" "}
        {showPPG ? "Show PPG" : "Hide PPG"}
      </div>

      {error && <div style={{ marginTop: 16, color: "#b00020" }}>{error}</div>}

      <div style={{ marginTop: 12 }}>
        {players.length === 0 && !loading && <div style={{ color: "#666" }}>No data. Try a different season or team.</div>}

        {players.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "8px" }}>#</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "8px" }}>Player</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: "8px" }}>GP</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: "8px" }}>PPG</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, idx) => {
                const isRevealed = !!revealed[p.player_id];
                const showGpCell = showGP || isRevealed;
                const showPpgCell = showPPG || isRevealed;

                const guessValue = guesses[p.player_id] ?? "";
                const isActiveFixed =
                  fixedOrder &&
                  !isRevealed &&
                  nextIndexToReveal !== -1 &&
                  idx === nextIndexToReveal &&
                  lives > 0 &&
                  !allRevealed;

                const submitEnabled = isActiveFixed && guessValue.trim().length > 0;

                return (
                  <tr key={p.player_id}>
                    <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>{idx + 1}</td>

                    <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                      {isRevealed ? (
                        p.player_name
                      ) : fixedOrder ? (
                        isActiveFixed ? (
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <input
                              type="text"
                              value={guessValue}
                              onChange={(e) => setGuess(p.player_id, e.target.value)}
                              placeholder="Enter player's full name"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && submitEnabled) {
                                  submitGuess(p.player_id);
                                }
                              }}
                              className={shakingRowId === p.player_id ? "shake" : undefined}
                              style={{
                                flex: "1 1 auto",
                                padding: "6px 8px",
                                borderRadius: 6,
                                border: "1px solid #ccc",
                                background: "#fff",
                              }}
                            />
                            <button
                              onClick={() => submitGuess(p.player_id)}
                              disabled={!submitEnabled}
                              style={{
                                padding: "6px 10px",
                                borderRadius: 6,
                                border: "1px solid #333",
                                background: submitEnabled ? "#111" : "#bbb",
                                color: "#fff",
                                cursor: submitEnabled ? "pointer" : "not-allowed",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Submit
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: "#999" }}>???</span>
                        )
                      ) : (
                        <span style={{ color: "#999" }}>???</span>
                      )}
                    </td>

                    <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0", textAlign: "right" }}>
                      {showGpCell ? p.games_played : "??"}
                    </td>
                    <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0", textAlign: "right" }}>
                      {showPpgCell ? p.ppg.toFixed(1) : "??"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Any-order mode: single global input */}
      {!fixedOrder && players.length > 0 && (
        <div
          style={{
            marginTop: 16,
            paddingTop: 12,
            borderTop: "1px solid #eee",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={globalGuess}
              onChange={(e) => setGlobalGuess(e.target.value)}
              placeholder="Enter full player name for any row"
              onKeyDown={(e) => {
                if (e.key === "Enter") submitGlobalGuessHandler();
              }}
              disabled={lives === 0 || allRevealed}
              className={shakeGlobal ? "shake" : undefined}
              style={{
                flex: "1 1 auto",
                padding: "8px 10px",
                borderRadius: 6,
                border: "1px solid #ccc",
                background: lives === 0 || allRevealed ? "#f6f6f6" : "#fff",
              }}
            />
            <button
              onClick={submitGlobalGuessHandler}
              disabled={lives === 0 || allRevealed || globalGuess.trim().length === 0}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #333",
                background: lives === 0 || allRevealed || globalGuess.trim().length === 0 ? "#bbb" : "#111",
                color: "#fff",
                cursor:
                  lives === 0 || allRevealed || globalGuess.trim().length === 0 ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Submit Guess
            </button>
          </div>
          {globalMessage && <div style={{ color: "#444" }}>{globalMessage}</div>}
        </div>
      )}

      <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
        <button
          onClick={giveUp}
          disabled={players.length === 0 || lives === 0 || allRevealed}
          style={{ padding: "6px 10px", opacity: players.length === 0 || lives === 0 || allRevealed ? 0.6 : 1 }}
          title="Reveal all answers"
        >
          Give Up
        </button>
      </div>
    </div>
  );
}