// client/src/lib/safeNav.ts
export function safeInternalPath(p?: string): string {
  if (!p) return "/";
  try {
    const u = new URL(p, window.location.origin);
    if (u.origin !== window.location.origin) return "/";
    return u.pathname + u.search + u.hash;
  } catch {
    return "/";
  }
}