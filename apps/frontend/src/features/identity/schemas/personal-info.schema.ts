import { z } from 'zod';
import { ageInYears, cairoToday, isRealIsoDate } from '@/shared/lib/date/iso-date';

type Translate = (key: string, values?: Record<string, string | number | Date>) => string;

/** A real date (31 Feb rejected), not in the future (Cairo today); the API takes any ISO 8601 and sets no age bound. */
/** The oldest age a date of birth may give -- a bound on typos, the same one the API applies. */
export const MAX_AGE_YEARS = 120;

export interface AgeRange {
  min: number;
  max: number;
}

function dateOfBirth(t: Translate, ageRange?: AgeRange) {
  const isPastDay = (value: string) => isRealIsoDate(value) && value <= cairoToday();
  const age = (value: string) => ageInYears(value, cairoToday());
  const base = z
    .string()
    .min(1, t('dateOfBirthRequired'))
    .refine(isRealIsoDate, t('dateOfBirthInvalid'))
    .refine((value) => !isRealIsoDate(value) || value <= cairoToday(), t('dateOfBirthFuture'))
    .refine((value) => !isPastDay(value) || age(value) <= MAX_AGE_YEARS, t('dateOfBirthTooOld', { max: MAX_AGE_YEARS }));
  // Only a flow with an age range (the doctor application) adds -- and translates -- this rule.
  if (!ageRange) return base;
  return base.refine(
    (value) => !isPastDay(value) || (age(value) >= ageRange.min && age(value) <= ageRange.max),
    t('dateOfBirthAgeRange', { min: ageRange.min, max: ageRange.max }),
  );
}

/** Onboarding Redesign (2026-07-21 proposal, Stage O.1/O.6): the shared Personal Info step's schema -- matches MyAccountController's real UpdatePersonalProfileRequestDto exactly (dateOfBirth/gender/nationalityId/address). Full name is Account-owned, set once at registration, not editable through this step. */
// `ageRange`: the doctor application's practising-age range (22-90); everyone else, any plausible date.
export function createPersonalInfoSchema(t: Translate, options: { ageRange?: AgeRange } = {}) {
  return z.object({
    dateOfBirth: dateOfBirth(t, options.ageRange),
    gender: z.enum(['male', 'female', 'other'], { required_error: t('genderRequired') }),
    nationalityId: z.string().min(1, t('nationalityRequired')),
    address: z.string().min(1, t('addressRequired')).max(500, t('addressTooLong', { max: 500 })),
  });
}

/**
 * The patient intake's essentials only (product decision, 2026-09): what booking truly needs. Nationality and address
 * become optional nudges on the profile page. The date of birth is sent as `YYYY-MM-DD` (the API takes any ISO 8601);
 * it must be a real date and not in the future -- no age bound exists in this app or the API.
 */
export function createEssentialInfoSchema(t: Translate) {
  return z.object({
    dateOfBirth: dateOfBirth(t),
    gender: z.enum(['male', 'female', 'other'], { required_error: t('genderRequired') }),
    phoneNumber: z
      .string()
      .trim()
      .min(1, t('phoneRequired'))
      .regex(/^\+?[0-9\s-]{7,20}$/, t('phoneInvalid')),
  });
}

export type EssentialInfoFormValues = z.infer<ReturnType<typeof createEssentialInfoSchema>>;

export type PersonalInfoFormValues = z.infer<ReturnType<typeof createPersonalInfoSchema>>;
