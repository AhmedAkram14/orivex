import type { PatientProfile } from '@/features/patient/api/types';

/**
 * Onboarding Redesign follow-up (2026-07-26): a Patient must fill in gender,
 * nationality, address (Identity-owned, composed onto this same response)
 * and blood type, allergies, chronic conditions (PatientProfile's own
 * fields) before the dashboard becomes reachable -- emergency contacts and
 * insurance provider stay optional. Checked from the one composed
 * `GET /patients/me` response rather than a separate Account fetch, since
 * `PatientProfileResponseDto` already includes both.
 */
export function isPatientProfileComplete(profile: PatientProfile): boolean {
  return Boolean(
    profile.gender &&
      profile.nationalityId &&
      profile.address &&
      profile.bloodType &&
      profile.allergies &&
      profile.chronicDiseases,
  );
}
