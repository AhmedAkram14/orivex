'use client';

import { OnboardingFlow } from '@/features/doctor/components/onboarding/onboarding-flow';
import { RequireRole } from '@/shared/auth/require-role';

/**
 * Doctor Onboarding (Phase 4 continuation) -- gated to `patient` only:
 * every account starts and stays Patient through the entire Draft/Pending/
 * Rejected lifecycle (`PromoteDoctorRoleOnVerificationHandler` promotes to
 * Doctor automatically the moment an admin approves), so an already-Doctor
 * account has no reason to be here and is correctly redirected away.
 * Rendered outside `(protected)`'s `AppShell` (see this folder's layout); the flow owns its focused chrome.
 */
export default function DoctorOnboardingPage() {
  return (
    <RequireRole roles={['patient']} redirectTo="/forbidden">
      <OnboardingFlow />
    </RequireRole>
  );
}
