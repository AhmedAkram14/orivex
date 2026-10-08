'use client';

import { PatientIntakeFlow } from '@/features/journey/components/patient-intake-flow';
import { RequireRole } from '@/shared/auth/require-role';

/**
 * Product follow-up (2026-07-26): the mandatory patient intake, reachable only by a Patient-role account after
 * choosing "I'm a patient" on `/journey`. `/dashboard` and `/patient` both redirect here whenever the account has a
 * bare `PatientProfile` row but hasn't completed the required fields yet -- nothing links here directly otherwise.
 * Rendered outside `(protected)`'s `AppShell` (see this folder's layout); `PatientIntakeFlow` owns its own chrome.
 */
export default function PatientIntakePage() {
  return (
    <RequireRole roles={['patient']} redirectTo="/forbidden">
      <PatientIntakeFlow />
    </RequireRole>
  );
}
