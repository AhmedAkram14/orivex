'use client';

import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '@/features/doctor/api/doctor-api';
import { patientApi } from '@/features/patient/api/patient-api';
import { ApiError } from '@/shared/lib/api/client';

export interface JourneyStatus {
  hasDoctorProfile: boolean;
  hasPatientProfile: boolean;
  /** True only when the account has neither profile row at all (§3 of the Onboarding Redesign proposal) -- the "Choose Your Journey" gating rule. */
  needsJourneyChoice: boolean;
}

// GET /doctors/me cleanly 404s when no DoctorProfile exists (no side
// effect) -- unlike GET /patients/me, which lazily creates a bare
// PatientProfile on first read, so that endpoint is deliberately never
// used here. See patientApi.checkProfileExists's own comment.
async function hasExistingDoctorProfile(): Promise<boolean> {
  try {
    await doctorApi.getProfile();
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Onboarding Redesign (2026-07-21 proposal, Stage O.5): composes two
 * independent, side-effect-free existence checks (one per module, per
 * `docs/10-backend-architecture.md`'s dependency rules -- no single
 * backend endpoint exposes this, and IdentityModule must never depend on
 * DoctorModule/PatientModule to provide one) into the single gating
 * decision the Choose-Your-Journey screen and the shared dashboard both
 * need.
 */
export function useJourneyStatus(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['journey-status'],
    enabled: options.enabled ?? true,
    queryFn: async (): Promise<JourneyStatus> => {
      const [hasDoctorProfile, existsResponse] = await Promise.all([
        hasExistingDoctorProfile(),
        patientApi.checkProfileExists(),
      ]);
      const hasPatientProfile = existsResponse.exists;
      return { hasDoctorProfile, hasPatientProfile, needsJourneyChoice: !hasDoctorProfile && !hasPatientProfile };
    },
  });
}
