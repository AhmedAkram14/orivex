/**
 * Onboarding Redesign (2026-07-21 proposal, Stage O.7): validates a
 * `?returnTo=` query value before it's ever handed to `router.push` --
 * must be a same-app-relative path (starts with a single `/`, never a
 * protocol-relative `//host/...` or an absolute URL), open-redirect
 * hygiene for a value that arrives as free-form user-controllable input.
 * Returns `undefined` for anything else, never throws.
 */
export function parseReturnTo(value: string | null): string | undefined {
  if (!value) return undefined;
  if (!value.startsWith('/') || value.startsWith('//')) return undefined;
  return value;
}
