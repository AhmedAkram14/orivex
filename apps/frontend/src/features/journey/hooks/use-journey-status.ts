'use client';

import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '@/features/doctor/api/doctor-api';
import { patientApi } from '@/features/patient/api/patient-api';
import { isPatientProfileComplete } from '@/features/patient/lib/profile-completeness';
import { ApiError } from '@/shared/lib/api/client';

export interface JourneyStatus {
  hasDoctorProfile: boolean;
  hasPatientProfile: boolean;
  /** True only when the account has neither profile row at all (§3 of the Onboarding Redesign proposal) -- the "Choose Your Journey" gating rule. */
  needsJourneyChoice: boolean;
  /**
   * Product follow-up (2026-07-26): true once a Patient has chosen "book
   * appointments" (so a bare `PatientProfile` row exists) but hasn't yet
   * filled in the required Personal Info + Medical Information fields --
   * supersedes the original proposal's "optional, fill in any time" §3
   * decision per explicit product direction. `/dashboard` and `/patient`
   * both redirect to `/patient/intake` while this is true.
   */
  needsPatientIntake: boolean;
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

      // Safe to call now (never before hasPatientProfile is confirmed true)
      // -- GET /patients/me lazily creates a bare row on first read, which
      // would prematurely suppress the Choose-Your-Journey screen above.
      const isComplete = hasPatientProfile ? isPatientProfileComplete(await patientApi.getProfile()) : false;

      return {
        hasDoctorProfile,
        hasPatientProfile,
        needsJourneyChoice: !hasDoctorProfile && !hasPatientProfile,
        needsPatientIntake: !hasDoctorProfile && hasPatientProfile && !isComplete,
      };
    },
  });
}
