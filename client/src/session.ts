// Simple per-tab session hash for gating access to the Game page
export const SESSION_STORAGE_KEY = "game.sessionHash";

function createSessionHash(): string {
  // Short, unique-ish hash for the session
  return "sid-" + Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
}

// Landing page should call this to ensure a session exists
export function ensureSessionHash(): string {
  let val = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!val) {
    val = createSessionHash();
    sessionStorage.setItem(SESSION_STORAGE_KEY, val);
  }
  return val;
}

// Game page should only read; do not create if missing (prevents bypass)
export function getSessionHash(): string | null {
  return sessionStorage.getItem(SESSION_STORAGE_KEY);
}