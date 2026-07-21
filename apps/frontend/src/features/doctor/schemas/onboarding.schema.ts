import { z } from 'zod';

type Translate = (key: string, values?: Record<string, string | number | Date>) => string;

/** Doctor Onboarding (Phase 4 continuation): the profile step's own schema -- a superset of `createDoctorProfileSchema` (adds licenseNumber, once-only, and an optional hospital affiliation). */
export function createOnboardingProfileSchema(t: Translate) {
  return z.object({
    licenseNumber: z.string().min(2, t('licenseNumberRequired')),
    specialty: z.string().min(2, t('specialtyRequired')),
    biography: z.string().max(500, t('biographyTooLong', { max: 500 })).optional(),
    yearsOfExperience: z.coerce.number().int().min(0, t('experienceInvalid')).max(80, t('experienceInvalid')).optional(),
    languages: z.array(z.string()).min(1, t('languagesRequired')),
    consultationFeeAmount: z.coerce.number().min(0, t('feeInvalid')).optional(),
    hospitalId: z.string().optional(),
  });
}

export type OnboardingProfileFormValues = z.infer<ReturnType<typeof createOnboardingProfileSchema>>;
