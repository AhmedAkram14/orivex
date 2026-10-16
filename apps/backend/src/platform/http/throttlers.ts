import type { ThrottlerOptions } from '@nestjs/throttler';

// The one place the app's named throttlers are declared (ThrottlerModule.forRoot
// in app.module.ts). @nestjs/throttler only enforces throttlers declared here;
// a route's @Throttle() can override a declared throttler's limit, ttl and
// tracker, but cannot add a new one.
export const REFRESH_TOKEN_THROTTLER = 'refreshToken';

export const APP_THROTTLERS: ThrottlerOptions[] = [
  // `default`: every route, keyed by req.ip, 100/min unless a route overrides it.
  { ttl: 60_000, limit: 100 },
  // Opt-in: no effective limit unless a route sets one, which only
  // POST /auth/refresh does (keyed by its refresh token, see
  // refresh-token-throttle-tracker.ts).
  { name: REFRESH_TOKEN_THROTTLER, ttl: 60_000, limit: Number.MAX_SAFE_INTEGER },
];
