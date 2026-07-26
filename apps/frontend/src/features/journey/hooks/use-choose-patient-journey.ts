'use client';

import { useMutation } from '@tanstack/react-query';
import { patientApi } from '@/features/patient/api/patient-api';

/**
 * Onboarding Redesign (2026-07-21 proposal, Stage O.5): "book appointments"
 * card's action -- an explicit, deliberate call to GET /patients/me (its
 * lazy-create side effect is exactly what's wanted here, since the visitor
 * just made the choice), landing on the real Patient Dashboard once the
 * bare row exists.
 */
export function useChoosePatientJourney() {
  return useMutation({
    mutationFn: () => patientApi.getProfile(),
  });
}
