export class TTLCache<T = unknown> {
  private store = new Map<string, { value: T; expiresAt: number }>();
  constructor(private defaultTtlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
    }

  set(key: string, value: T, ttlMs?: number) {
    const ttl = typeof ttlMs === "number" ? ttlMs : this.defaultTtlMs;
    this.store.set(key, { value, expiresAt: Date.now() + ttl });
  }

  del(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}