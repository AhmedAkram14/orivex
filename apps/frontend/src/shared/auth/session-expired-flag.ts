/**
 * In-memory (per-tab, module-level) marker set by `useSilentRefresh`
 * (Phase 9 [VERIFY]) when a background token refresh genuinely fails while
 * the user was authenticated in this tab -- as opposed to `RequireAuth`'s
 * default case, a visitor with no session at all. `RequireAuth` consumes
 * this once, right when it notices `status` has become 'unauthenticated',
 * to decide whether to send that visitor to `/session-expired` (had a
 * session, it ended -- friendlier, accurate copy) instead of the generic
 * `/unauthorized` ("Sign in required", accurate for a first-time visitor
 * but misleading for this case, per the audit).
 *
 * Deliberately not persisted to sessionStorage/localStorage: it only needs
 * to survive the moment between the failed refresh and RequireAuth's next
 * render in the same tab, and must NOT survive a page reload or leak
 * across tabs -- a fresh page load with no session at all (the common,
 * unrelated case) must still land on the generic Unauthorized page, not
 * Session Expired.
 */
let expired = false;

export const sessionExpiredFlag = {
  mark(): void {
    expired = true;
  },
  /** Reads and clears in one step so it's never accidentally reused for a later, unrelated unauthenticated transition. */
  consume(): boolean {
    const value = expired;
    expired = false;
    return value;
  },
};
