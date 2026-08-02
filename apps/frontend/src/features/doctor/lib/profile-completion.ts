import type { DoctorProfile } from '@/features/doctor/api/types';

/**
 * Doctor Profile Redesign (2026-08-02): the Profile Completion widget's
 * percentage is computed honestly from the doctor's own real fields --
 * never a hardcoded figure. Seven equally-weighted checks (100/7 each,
 * rounded): `biography`, `yearsOfExperience`, at least one `languages`
 * entry, `consultationFeeAmount`, at least one publication/award/work-
 * experience entry (counted once as a single "portfolio" check rather than
 * three separate ones, since any one of them already demonstrates a
 * populated professional history), `insuranceProviders` non-empty, and
 * `licenseExpiryDate`. A pure function, deliberately -- easy to unit test
 * without rendering anything.
 */
export type ProfileCompletionField =
  | 'biography'
  | 'yearsOfExperience'
  | 'languages'
  | 'consultationFeeAmount'
  | 'portfolio'
  | 'insuranceProviders'
  | 'licenseExpiryDate';

export interface ProfileCompletionResult {
  percent: number;
  /** Only fields that are genuinely empty on this profile -- never a fixed static list. */
  missingFields: ProfileCompletionField[];
}

export function computeProfileCompletion(profile: DoctorProfile): ProfileCompletionResult {
  const checks: Record<ProfileCompletionField, boolean> = {
    biography: Boolean(profile.biography && profile.biography.trim().length > 0),
    yearsOfExperience: profile.yearsOfExperience !== undefined,
    languages: (profile.languages ?? []).length > 0,
    consultationFeeAmount: profile.consultationFeeAmount !== undefined,
    portfolio:
      (profile.publications ?? []).length > 0 ||
      (profile.awards ?? []).length > 0 ||
      (profile.workExperience ?? []).length > 0,
    insuranceProviders: (profile.insuranceProviders ?? []).length > 0,
    licenseExpiryDate: Boolean(profile.licenseExpiryDate),
  };

  const fields = Object.keys(checks) as ProfileCompletionField[];
  const completedCount = fields.filter((field) => checks[field]).length;
  const percent = Math.round((completedCount / fields.length) * 100);
  const missingFields = fields.filter((field) => !checks[field]);

  return { percent, missingFields };
}
