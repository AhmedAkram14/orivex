import { HttpResponse } from 'msw';
import { getMyIdentityVerificationStatus } from '@/mocks/patient-store';

/**
 * Onboarding Redesign (2026-07-21 proposal, Stage O.4/O.7): a shared helper
 * so `scheduling.ts`/`payment.ts`/`telemedicine.ts`/`media-assets.ts` each
 * enforce the same gate real backend guard enforces
 * (`RequiresIdentityVerificationGuard`), instead of duplicating the
 * response shape four times.
 */
export function isPatientVerified(): boolean {
  return getMyIdentityVerificationStatus().isVerified;
}

export function identityVerificationRequiredResponse() {
  return HttpResponse.json(
    {
      error: {
        code: 'IDENTITY_VERIFICATION_REQUIRED',
        message: 'Identity verification is required for this action.',
        requestId: 'mock',
        timestamp: new Date().toISOString(),
      },
    },
    { status: 403 },
  );
}
