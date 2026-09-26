import type { PatientProfile } from '@/features/patient/api/types';

/**
 * What booking truly needs (product decision, 2026-09): name (set at
 * registration), date of birth, gender and a phone number. Only these gate the
 * dashboard. Everything else is an optional nudge -- see
 * `getOptionalProfileGaps`.
 */
export function isPatientProfileComplete(profile: PatientProfile): boolean {
  return Boolean(profile.gender && profile.dateOfBirth && profile.phoneNumber);
}

export const OPTIONAL_PROFILE_FIELDS = ['nationality', 'address', 'bloodType', 'allergies', 'chronicDiseases', 'emergencyContact', 'insurance'] as const;
export type OptionalProfileField = (typeof OPTIONAL_PROFILE_FIELDS)[number];

/** Optional fields still empty, in nudge order. */
export function getOptionalProfileGaps(profile: PatientProfile): OptionalProfileField[] {
  const filled: Record<OptionalProfileField, boolean> = {
    nationality: Boolean(profile.nationalityId),
    address: Boolean(profile.address),
    bloodType: Boolean(profile.bloodType),
    allergies: Boolean(profile.allergies),
    chronicDiseases: Boolean(profile.chronicDiseases),
    emergencyContact: (profile.emergencyContacts?.length ?? 0) > 0,
    insurance: Boolean(profile.insuranceProviderId),
  };
  return OPTIONAL_PROFILE_FIELDS.filter((field) => !filled[field]);
}
