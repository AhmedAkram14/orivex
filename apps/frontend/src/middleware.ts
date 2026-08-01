import createMiddleware from 'next-intl/middleware';
import { routing } from '@/shared/i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Runs on every path except static assets, Next internals, and API-style
  // routes -- `api` per next-intl's own recommended matcher (no such route
  // exists in this app yet, excluded so a future one doesn't silently get
  // a locale prefix applied to it); `auth` because one now does exist:
  // next.config.ts rewrites /auth/* to the backend (the Safari/iOS
  // cross-site-cookie fix), and without this exclusion this middleware ran
  // first and tried to locale-prefix it (e.g. /auth/login -> /en/auth/login)
  // before the rewrite ever got a chance to match, 404ing every request.
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)'],
};
