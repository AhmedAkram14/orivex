import { createHash } from 'node:crypto';

import { readRefreshCookie, type RequestWithCookies } from './refresh-cookie.util.js';

// Throttle tracker for POST /auth/refresh. ThrottlerGuard's default tracker is
// req.ip, which under `trust proxy 1` is the last hop before Render -- for the
// frontend's same-origin /auth/* rewrite that is Vercel's egress address,
// shared by every user behind it. Keying on the refresh token instead gives
// each signed-in session its own bucket without trusting any client-supplied
// IP header. Only a SHA-256 of the token is used (the throttler hashes its
// key again), so the token itself is never stored or logged. A refresh token
// is 32 random bytes, so per-token keying opens no brute-force path. Without
// the cookie, the bucket is req.ip, exactly as before.
export function refreshTokenThrottleTracker(request: Record<string, unknown>): string {
  const refreshToken = readRefreshCookie(request as unknown as RequestWithCookies);
  if (refreshToken) {
    return `refresh-token:${createHash('sha256').update(refreshToken).digest('hex')}`;
  }
  return String(request.ip ?? '');
}
