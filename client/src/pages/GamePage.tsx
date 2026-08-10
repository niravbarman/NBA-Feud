// client/src/pages/GamePage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getTeamPPG, TeamPPGPlayer } from "../api";
import { teams } from "../teams";
import { getSessionHash } from "../session";
import { db, ensureUser } from "../lib/firebase";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";

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

// Robust accessors in case API fields vary or are strings
function getGP(p: any): number {
  let v = p?.gp ?? p?.GP ?? p?.games_played ?? p?.gamesPlayed ?? p?.games ?? null;
  if (typeof v === "string") v = parseInt(v, 10);
  if (typeof v !== "number" || Number.isNaN(v)) return 0;
  return v;
}
function getPPG(p: any): number {
  let v = p?.ppg ?? p?.PPG ?? p?.points_per_game ?? p?.pts_per_g ?? p?.pointsPerGame ?? null;
  if (typeof v === "string") v = parseFloat(v);
  if (typeof v !== "number" || Number.isNaN(v)) return 0;
  return v;
}

export default function GamePage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Only a token exists in the hash: #<token>
  const token = (location.hash || "").replace(/^#/, "");

  const [verified, setVerified] = useState(false);

  // Game configuration derived from the session-bound ticket
  const [season, setSeason] = useState<string>("");
  const [teamId, setTeamId] = useState<number>(0);
  const [seasonType, setSeasonType] = useState<string>("Regular Season");
  const [fixedOrder, setFixedOrder] = useState<boolean>(false);
  const [showGP, setShowGP] = useState<boolean>(false);
  const [showPPG, setShowPPG] = useState<boolean>(false);

  // Gameplay state
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState<TeamPPGPlayer[]>([]);
  const [revealed, setRevealed] = useState<RevealMap>({});
  const [guesses, setGuesses] = useState<GuessMap>({});
  const [lives, setLives] = useState<number>(TOTAL_LIVES);
  const [score, setScore] = useState<number>(0);

  // Any-order mode: single global input
  const [globalGuess, setGlobalGuess] = useState<string>("");
  const [globalMessage, setGlobalMessage] = useState<string>("");
  const [attemptedNames, setAttemptedNames] = useState<Set<string>>(new Set());

  // Shake states
  const [shakingRowId, setShakingRowId] = useState<number | null>(null);
  const [shakeGlobal, setShakeGlobal] = useState<boolean>(false);

  // Ensure save happens only once per completed game instance
  const savedAttemptRef = useRef<boolean>(false);

  // Load and validate ticket
  useEffect(() => {
    const localSessionHash = getSessionHash();
    if (!token) {
      navigate("/", { replace: true });
      return;
    }
    const raw = sessionStorage.getItem(`game.ticket.${token}`);
    if (!raw) {
      navigate("/", { replace: true });
      return;
    }
    try {
      const ticket = JSON.parse(raw);
      if (!ticket || ticket.sessionHash !== localSessionHash) {
        navigate("/", { replace: true });
        return;
      }

      const s = ticket.settings || {};
      const chosenTeamId = Number(s.team_id || 0);
      const chosenSeason = String(s.season || "");
      const chosenSeasonType = String(s.season_type || "Regular Season");
      const hardFlag = String(s.hard || "0") === "1";
      const gpFlag = String(s.show_gp || "0") === "1";
      const ppgFlag = String(s.show_ppg || "0") === "1";

      if (!chosenTeamId || !chosenSeason) {
        navigate("/", { replace: true });
        return;
      }

      setTeamId(chosenTeamId);
      setSeason(chosenSeason);
      setSeasonType(chosenSeasonType);
      setFixedOrder(hardFlag);
      setShowGP(gpFlag);
      setShowPPG(ppgFlag);

      // Persist for convenience
      localStorage.setItem(LS_KEYS.season, chosenSeason);
      localStorage.setItem(LS_KEYS.teamId, String(chosenTeamId));
      localStorage.setItem(LS_KEYS.seasonType, chosenSeasonType);
      localStorage.setItem(LS_KEYS.hard, hardFlag ? "1" : "0");
      localStorage.setItem(LS_KEYS.showGP, gpFlag ? "1" : "0");
      localStorage.setItem(LS_KEYS.showPPG, ppgFlag ? "1" : "0");

      // Infer difficulty for continuity
      let inferred: "easy" | "medium" | "hard" | "impossible" = "medium";
      if (gpFlag && ppgFlag && !hardFlag) inferred = "easy";
      else if (!gpFlag && !ppgFlag && !hardFlag) inferred = "medium";
      else if (gpFlag && ppgFlag && hardFlag) inferred = "hard";
      else if (!gpFlag && !ppgFlag && hardFlag) inferred = "impossible";
      localStorage.setItem(LS_KEYS.difficulty, inferred);

      setVerified(true);
    } catch {
      navigate("/", { replace: true });
    }
  }, [token, navigate]);

  // Fetch data once verified
  useEffect(() => {
    if (!verified) return;
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
          savedAttemptRef.current = false; // allow saving again for this new round
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
  }, [verified, teamId, season, seasonType]);

  function setGuess(playerId: number, value: string) {
    setGuesses((prev) => ({ ...prev, [playerId]: value }));
  }

  function revealAll() {
    const all: RevealMap = {};
    players.forEach((p) => (all[(p as any).player_id] = true));
    setRevealed(all);
  }

  const nextIndexToReveal = useMemo(() => {
    for (let i = 0; i < players.length; i++) {
      const p = players[i] as any;
      if (!revealed[p.player_id]) return i;
    }
    return -1;
  }, [players, revealed]);

  const allRevealed = useMemo(
    () => players.length > 0 && players.every((p) => revealed[(p as any).player_id]),
    [players, revealed]
  );

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

  function submitGuess(playerId: number) {
    const row = players.find((p) => (p as any).player_id === playerId) as any;
    if (!row) return;
    if (revealed[playerId]) return;

    const guess = (guesses[playerId] || "").trim();
    const isActiveRow =
      fixedOrder && nextIndexToReveal !== -1 && (players[nextIndexToReveal] as any)?.player_id === playerId;

    if (lives <= 0 || !isActiveRow || guess === "" || allRevealed) return;

    const right = normalizeName(guess) === normalizeName(row.player_name);

    if (right) {
      setRevealed((prev) => ({ ...prev, [playerId]: true }));
      setScore((s) => s + 10);
      setGuesses((prev) => ({ ...prev, [playerId]: "" }));
    } else {
      setLives((l) => Math.max(0, l - 1));
      setShakingRowId(playerId);
      window.setTimeout(() => {
        setShakingRowId((curr) => (curr === playerId ? null : curr));
      }, 400);
    }
  }

  function submitGlobalGuessHandler() {
    if (fixedOrder || lives === 0 || allRevealed) return;
    const raw = globalGuess.trim();
    if (!raw) return;

    const key = normalizeName(raw);
    if (attemptedNames.has(key)) {
      setGlobalMessage("Already guessed that name.");
      setGlobalGuess("");
      return;
    }

    setAttemptedNames((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });

    const match = players.find((p) => normalizeName((p as any).player_name) === key) as any;

    if (match) {
      if (!revealed[match.player_id]) {
        setRevealed((prev) => ({ ...prev, [match.player_id]: true }));
        setScore((s) => s + 10);
        setGlobalMessage("Correct!");
      } else {
        setGlobalMessage("Already guessed that name.");
      }
    } else {
      setLives((l) => Math.max(0, l - 1));
      setGlobalMessage("Incorrect.");
      setShakeGlobal(true);
      window.setTimeout(() => setShakeGlobal(false), 400);
    }

    setGlobalGuess("");
  }

  const teamName = useMemo(() => teams.find((t) => t.id === teamId)?.name || "Team", [teamId]);

  // Persist score to Firestore once when the game ends
  useEffect(() => {
    async function saveScoreAttempt() {
      try {
        const uid = await ensureUser();
        const key = `${teamId}_${season}_${seasonType}`;
        const ref = doc(db, "users", uid, "scores", key);

        await runTransaction(db, async (tx) => {
          const snap = await tx.get(ref);
          const now = serverTimestamp();

          if (!snap.exists()) {
            tx.set(ref, {
              teamId,
              teamName,
              season,
              seasonType,
              firstAttemptScore: score,
              highScore: score,
              firstAttemptAt: now,
              updatedAt: now,
              attempts: 1,
            });
          } else {
            const data = snap.data() as any;
            const existingFirst =
              typeof data.firstAttemptScore === "number" ? data.firstAttemptScore : score;
            const newHigh = Math.max(Number(data.highScore || 0), score);
            const attempts = Number(data.attempts || 0) + 1;

            tx.update(ref, {
              teamId,
              teamName,
              season,
              seasonType,
              firstAttemptScore: existingFirst, // do not overwrite
              highScore: newHigh,
              updatedAt: now,
              attempts,
            });
          }
        });
      } catch (err) {
        console.error("Failed to save score:", err);
      }
    }

    const gameEnded = players.length > 0 && (allRevealed || lives === 0);
    if (gameEnded && !savedAttemptRef.current) {
      savedAttemptRef.current = true; // ensure single save per round
      saveScoreAttempt();
    }
  }, [allRevealed, lives, players.length, teamId, season, seasonType, teamName, score]);

  if (!verified) {
    return (
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: 16, fontFamily: "system-ui, sans-serif" }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>NBA Feud</h1>
        <div style={{ marginTop: 12, color: "#666" }}>Verifying game session…</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 16, fontFamily: "system-ui, sans-serif" }}>
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

          .game-topbar {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 12px;
          }
          .table-scroll {
            width: 100%;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          .table-scroll table {
            min-width: 560px;
          }

          @media (max-width: 800px) {
            .game-topbar {
              flex-direction: column;
              align-items: flex-start;
              gap: 8px;
            }
          }
        `}
      </style>

      <div className="game-topbar">
        <h1 style={{ margin: 0, fontSize: 24 }}>
          {teamName} — {season} ({seasonType})
        </h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/home")}
            style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc", cursor: "pointer" }}
          >
            Back to Home
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc", cursor: "pointer" }}
            title="Reload data"
          >
            Refresh
          </button>
        </div>
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
        Game settings: Min. 15 GP - {fixedOrder ? "Fixed order" : "Any order"}, {showGP ? "Show GP" : "Hide GP"},{" "}
        {showPPG ? "Show PPG" : "Hide PPG"}
      </div>

      {error && <div style={{ marginTop: 16, color: "#b00020" }}>{error}</div>}

      <div style={{ marginTop: 12 }}>
        {players.length === 0 && !loading && <div style={{ color: "#666" }}>No data. Try a different season or team.</div>}

        {players.length > 0 && (
          <div className="table-scroll">
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
                {players.map((row, idx) => {
                  const p: any = row;
                  const pid = p.player_id as number;
                  const isRevealed = !!revealed[pid];
                  const isActiveRow =
                    fixedOrder && nextIndexToReveal !== -1 && (players[nextIndexToReveal] as any)?.player_id === pid;

                  const inputStyle: React.CSSProperties = {
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #ccc",
                    background: "#fff",
                    fontSize: 14,
                    boxSizing: "border-box",
                  };

                  const gp = getGP(p);
                  const ppg = getPPG(p);

                  // Per-row reveal logic for GP and PPG: show when globally enabled or when the row is revealed by a correct guess
                  const showGPCell = showGP || isRevealed;
                  const showPPGCell = showPPG || isRevealed;

                  return (
                    <tr key={pid}>
                      <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>{idx + 1}</td>
                      <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                        {fixedOrder ? (
                          isRevealed ? (
                            <span style={{ fontWeight: 600 }}>{p.player_name}</span>
                          ) : isActiveRow ? (
                            <div style={{ display: "flex", gap: 8 }}>
                              <input
                                className={shakingRowId === pid ? "shake" : undefined}
                                type="text"
                                placeholder="Type full name…"
                                value={guesses[pid] || ""}
                                onChange={(e) => setGuess(pid, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    submitGuess(pid);
                                  }
                                }}
                                style={inputStyle}
                                autoFocus
                                disabled={lives === 0 || allRevealed}
                                aria-label={`Guess player rank ${idx + 1}`}
                              />
                              <button
                                onClick={() => submitGuess(pid)}
                                style={{
                                  padding: "8px 12px",
                                  borderRadius: 8,
                                  border: "1px solid #111",
                                  background: "#111",
                                  color: "#fff",
                                  cursor: "pointer",
                                  fontWeight: 700,
                                }}
                                disabled={lives === 0 || allRevealed || (guesses[pid] || "").trim() === ""}
                                aria-label="Submit guess"
                              >
                                Submit
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: "#999" }}>Locked</span>
                          )
                        ) : isRevealed ? (
                          <span style={{ fontWeight: 600 }}>{p.player_name}</span>
                        ) : (
                          <span style={{ color: "#999" }}>Hidden</span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          borderBottom: "1px solid #f0f0f0",
                          textAlign: "right",
                          color: showGPCell ? "#333" : "#bbb",
                        }}
                        title={showGPCell ? String(gp) : "Hidden"}
                      >
                        {showGPCell ? gp : "—"}
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          borderBottom: "1px solid #f0f0f0",
                          textAlign: "right",
                          color: showPPGCell ? "#333" : "#bbb",
                        }}
                        title={showPPGCell ? String(ppg) : "Hidden"}
                      >
                        {showPPGCell ? (Math.round(ppg * 10) / 10).toFixed(1) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Any-order mode global input */}
      {!fixedOrder && players.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              className={shakeGlobal ? "shake" : undefined}
              type="text"
              placeholder={lives === 0 || allRevealed ? "Game over" : "Type a player's full name…"}
              value={globalGuess}
              onChange={(e) => setGlobalGuess(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitGlobalGuessHandler();
                }
              }}
              disabled={lives === 0 || allRevealed}
              style={{
                flex: "1 1 280px",
                minWidth: 220,
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #ccc",
                background: "#fff",
                fontSize: 14,
                boxSizing: "border-box",
              }}
              aria-label="Global player guess"
            />
            <button
              onClick={submitGlobalGuessHandler}
              disabled={lives === 0 || allRevealed || globalGuess.trim() === ""}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #111",
                background: "#111",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Submit Guess
            </button>
            <button
              onClick={giveUp}
              disabled={lives === 0 || allRevealed}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #ccc",
                background: "#fff",
                color: "#111",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Give Up
            </button>
          </div>
          {globalMessage && (
            <div style={{ marginTop: 8, color: globalMessage === "Correct!" ? "#1a7f37" : "#b00020", fontWeight: 600 }}>
              {globalMessage}
            </div>
          )}
        </div>
      )}

      {/* Fixed-order mode actions */}
      {fixedOrder && players.length > 0 && (
        <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={giveUp}
            disabled={lives === 0 || allRevealed}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #ccc",
              background: "#fff",
              color: "#111",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Give Up
          </button>
        </div>
      )}

      {/* End state */}
      {(allRevealed || lives === 0) && players.length > 0 && (
        <div
          style={{
            marginTop: 20,
            padding: 12,
            border: "1px solid #e6e6e6",
            background: "#fafafa",
            borderRadius: 8,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            {allRevealed && lives > 0 ? "All players revealed — well done!" : "Game over"}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/home")}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #ccc",
                background: "#fff",
                color: "#111",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Back to Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}