'use client';

import { PatientIntakeFlow } from '@/features/journey/components/patient-intake-flow';
import { RequireRole } from '@/shared/auth/require-role';
import { Page } from '@/shared/ui/layout/page';

/**
 * Product follow-up (2026-07-26): the mandatory Personal Info + Medical
 * Information intake, reachable only by a Patient-role account after
 * choosing "book appointments" on `/journey`. `/dashboard` and `/patient`
 * both redirect here whenever the account has a bare `PatientProfile` row
 * but hasn't completed the required fields yet -- nothing links here
 * directly otherwise.
 */
export default function PatientIntakePage() {
  return (
    <RequireRole roles={['patient']} redirectTo="/forbidden">
      <Page>
        <PatientIntakeFlow />
      </Page>
    </RequireRole>
  );
}
