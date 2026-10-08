import { z } from 'zod';
import { cairoToday, isRealIsoDate } from '@/shared/lib/date/iso-date';

type Translate = (key: string, values?: Record<string, string | number | Date>) => string;

/** A real date (31 Feb rejected), not in the future (Cairo today); the API takes any ISO 8601 and sets no age bound. */
function dateOfBirth(t: Translate) {
  return z
    .string()
    .min(1, t('dateOfBirthRequired'))
    .refine(isRealIsoDate, t('dateOfBirthInvalid'))
    .refine((value) => !isRealIsoDate(value) || value <= cairoToday(), t('dateOfBirthFuture'));
}

/** Onboarding Redesign (2026-07-21 proposal, Stage O.1/O.6): the shared Personal Info step's schema -- matches MyAccountController's real UpdatePersonalProfileRequestDto exactly (dateOfBirth/gender/nationalityId/address). Full name is Account-owned, set once at registration, not editable through this step. */
export function createPersonalInfoSchema(t: Translate) {
  return z.object({
    dateOfBirth: dateOfBirth(t),
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
