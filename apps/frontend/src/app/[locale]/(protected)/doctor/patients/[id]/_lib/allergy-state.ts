import { ALLERGY_CONFIRMATION_STALE_AFTER_DAYS, isStale } from './vital-staleness';

export type AllergyState =
  | { kind: 'present'; text: string }
  | { kind: 'confirmed-none'; confirmedAt: Date; confirmedByName?: string; isAged: boolean }
  | { kind: 'reported-none' }
  | { kind: 'not-asked' };

export interface AllergyStateProfile {
  allergies?: string;
  allergiesConfirmedNoneAt?: string;
  allergiesConfirmedByName?: string;
  /** Patient-Reported Allergy Status (2026-09-28) -- independent of, and never a substitute for, the doctor confirmation above. */
  allergiesStatus?: 'unknown' | 'none_reported' | 'has_allergies';
}

// Patient Record Page P0 fix, extended 2026-09-28 with the patient's own
// reported status -- pure function, independently testable from the banner
// component that renders it. `allergies` and `allergiesConfirmedNoneAt` stay
// mutually exclusive by construction (the backend's own domain invariant,
// PatientProfile.confirmNoKnownAllergies()), so `present` and
// `confirmed-none` never overlap. The doctor's confirmation is the stronger
// clinical signal and always wins over the patient's own `none_reported` --
// the two are checked independently and never merged.
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
  if (profile.allergiesStatus === 'none_reported') {
    return { kind: 'reported-none' };
  }
  return { kind: 'not-asked' };
}
