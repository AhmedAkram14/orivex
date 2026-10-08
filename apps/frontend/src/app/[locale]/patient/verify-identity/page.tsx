'use client';

import { useSearchParams } from 'next/navigation';
import { IdentityVerificationFlow } from '@/features/patient/components/identity-verification/identity-verification-flow';
import { parseReturnTo } from '@/shared/verification/return-to';
import { RequireRole } from '@/shared/auth/require-role';

/**
 * Patient Identity Verification (Onboarding Redesign Stage O.7). Reached from a gated action's prompt (with
 * `?returnTo=`) or directly. Rendered outside `(protected)`'s `AppShell` (see this folder's layout); the flow owns its
 * focused chrome, including the way back.
 */
export default function PatientVerifyIdentityPage() {
  const searchParams = useSearchParams();
  const returnTo = parseReturnTo(searchParams.get('returnTo'));

  return (
    <RequireRole roles={['patient']} redirectTo="/forbidden">
      <IdentityVerificationFlow returnTo={returnTo} />
    </RequireRole>
  );
}
