import createMiddleware from 'next-intl/middleware';
import { routing } from '@/shared/i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Runs on every path except static assets, Next internals, and API-style
  // routes (none exist in this app yet, but excluded per next-intl's own
  // recommended matcher so a future route doesn't silently get a locale
  // prefix applied to it).
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
