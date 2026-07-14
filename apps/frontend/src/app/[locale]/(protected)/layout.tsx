import type { ReactNode } from 'react';
import { RequireAuth } from '@/shared/auth/require-auth';

/**
 * Protected Routes — the mirror of `(guest)`'s layout, for pages that
 * require an active session. Redirects to `/unauthorized` rather than
 * `/login` directly, since Unauthorized is the dedicated page for "no
 * session at all attempting a protected page" (see that page's own
 * comment) and itself links to `/login`.
 */
export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <RequireAuth redirectTo="/unauthorized">{children}</RequireAuth>;
}
