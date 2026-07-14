import type { ReactNode } from 'react';
import { AppShell } from '@/features/shell/components/app-shell';
import { RequireAuth } from '@/shared/auth/require-auth';

/**
 * Protected Routes — the mirror of `(guest)`'s layout, for pages that
 * require an active session. Redirects to `/unauthorized` rather than
 * `/login` directly, since Unauthorized is the dedicated page for "no
 * session at all attempting a protected page" (see that page's own
 * comment) and itself links to `/login`.
 *
 * Every protected route renders inside the dashboard shell (Topbar/
 * Sidebar/Content/Footer, Phase 6) — `RequireAuth` guards access first,
 * `AppShell` provides the chrome once access is confirmed, so the shell
 * itself can safely assume `useAuth()` is authenticated.
 */
export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth redirectTo="/unauthorized">
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
