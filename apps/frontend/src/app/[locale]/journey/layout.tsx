import type { ReactNode } from 'react';
import { RequireAuth } from '@/shared/auth/require-auth';

/**
 * "Choose Your Journey" gets its own layout, deliberately outside
 * `(protected)`'s `AppShell` — this is a one-time role-selection screen,
 * not a workspace page, so it must not expose the dashboard sidebar/topbar
 * (there is nothing to navigate to yet: the account has neither a
 * DoctorProfile nor a PatientProfile row). Still requires an authenticated
 * session, same as every other protected route.
 */
export default function JourneyLayout({ children }: { children: ReactNode }) {
  return <RequireAuth redirectTo="/unauthorized">{children}</RequireAuth>;
}
