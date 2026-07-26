import { z } from 'zod';

export function createDoctorProfileSchema(t: (key: string, values?: Record<string, string | number | Date>) => string) {
  return z.object({
    specialtyId: z.string().min(1, t('specialtyRequired')),
    biography: z.string().max(500, t('biographyTooLong', { max: 500 })).optional(),
    yearsOfExperience: z.coerce.number().int().min(0, t('experienceInvalid')).max(80, t('experienceInvalid')).optional(),
    languages: z.array(z.string()).min(1, t('languagesRequired')),
  });
}

export type DoctorProfileFormValues = z.infer<ReturnType<typeof createDoctorProfileSchema>>;
