import { ALLERGY_CONFIRMATION_STALE_AFTER_DAYS, isStale } from './vital-staleness';

export type AllergyState =
  | { kind: 'present'; text: string }
  | { kind: 'confirmed-none'; confirmedAt: Date; confirmedByName?: string; isAged: boolean }
  | { kind: 'not-asked' };

export interface AllergyStateProfile {
  allergies?: string;
  allergiesConfirmedNoneAt?: string;
  allergiesConfirmedByName?: string;
}

// Patient Record Page P0 fix -- pure function, independently testable from
// the banner component that renders it. Three real states, matching the
// backend's own domain invariant (PatientProfile.confirmNoKnownAllergies()):
// `allergies` and `allergiesConfirmedNoneAt` are mutually exclusive by
// construction, so `present` and `confirmed-none` never overlap.
export function getAllergyState(profile: AllergyStateProfile, now: Date = new Date()): AllergyState {
  if (profile.allergies) {
    return { kind: 'present', text: profile.allergies };
  }
  if (profile.allergiesConfirmedNoneAt) {
    const confirmedAt = new Date(profile.allergiesConfirmedNoneAt);
    return {
      kind: 'confirmed-none',
      confirmedAt,
      confirmedByName: profile.allergiesConfirmedByName,
      isAged: isStale(confirmedAt, ALLERGY_CONFIRMATION_STALE_AFTER_DAYS, now),
    };
  }
  return { kind: 'not-asked' };
}
