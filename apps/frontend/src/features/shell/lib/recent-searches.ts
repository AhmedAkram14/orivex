const STORAGE_KEY = 'orivex-recent-commands';
const MAX_ENTRIES = 5;

/**
 * A per-browser, per-user history of recently executed command-palette
 * entries — client-side only, the same `localStorage` pattern
 * `theme-provider.tsx` uses. This is "recent searches" architecture per
 * this phase's explicit scope (Phase 18's real search indexing comes
 * later); today it records which of the fixed navigation/action commands
 * a user picked most recently, not a free-text query history.
 */
export function getRecentCommandIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function recordRecentCommand(id: string): void {
  if (typeof window === 'undefined') return;
  const existing = getRecentCommandIds().filter((entry) => entry !== id);
  const next = [id, ...existing].slice(0, MAX_ENTRIES);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
