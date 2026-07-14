/**
 * The `useFeatureFlag()`-style hook named in docs/13-engineering-bootstrap.md's
 * own final readiness review and scoped in Phase 20 of the frontend
 * roadmap — 🔒 blocked there on the backend's `ConfigurationModule`, which
 * doesn't exist. This is the shape that will wire to real flag state once
 * it does; today every flag simply resolves to its provided default,
 * evaluated locally, with no network call and no persistence. Do not use
 * this for anything where the wrong default has real consequences — it is
 * not a real flag system yet.
 */
export function useFeatureFlag(_key: string, defaultValue = false): boolean {
  return defaultValue;
}
