import { z } from 'zod';

type Translate = (key: string, values?: Record<string, string | number | Date>) => string;

/** Onboarding Redesign (2026-07-21 proposal, Stage O.1/O.6): the shared Personal Info step's schema -- matches MyAccountController's real UpdatePersonalProfileRequestDto exactly (dateOfBirth/gender/nationalityId/address). Full name is Account-owned, set once at registration, not editable through this step. */
export function createPersonalInfoSchema(t: Translate) {
  return z.object({
    dateOfBirth: z.string().min(1, t('dateOfBirthRequired')),
    gender: z.enum(['male', 'female', 'other'], { required_error: t('genderRequired') }),
    nationalityId: z.string().min(1, t('nationalityRequired')),
    address: z.string().min(1, t('addressRequired')).max(500, t('addressTooLong', { max: 500 })),
  });
}

/** True for a real calendar date written `YYYY-MM-DD` (rejects 2026-02-31 and partial dates). */
function isRealIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Today in Cairo (the operating time zone) as `YYYY-MM-DD`. */
function cairoToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());
}

/**
 * The patient intake's essentials only (product decision, 2026-09): what booking truly needs. Nationality and address
 * become optional nudges on the profile page. The date of birth is sent as `YYYY-MM-DD` (the API takes any ISO 8601);
 * it must be a real date and not in the future -- no age bound exists in this app or the API.
 */
export function createEssentialInfoSchema(t: Translate) {
  return z.object({
    dateOfBirth: z
      .string()
      .min(1, t('dateOfBirthRequired'))
      .refine(isRealIsoDate, t('dateOfBirthInvalid'))
      .refine((value) => !isRealIsoDate(value) || value <= cairoToday(), t('dateOfBirthFuture')),
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
