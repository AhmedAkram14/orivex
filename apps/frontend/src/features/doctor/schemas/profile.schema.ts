import { z } from 'zod';

export function createDoctorProfileSchema(t: (key: string, values?: Record<string, string | number | Date>) => string) {
  return z.object({
    specialization: z.string().min(2, t('specializationRequired')),
    bio: z.string().min(1, t('bioRequired')).max(500, t('bioTooLong', { max: 500 })),
    yearsOfExperience: z.coerce.number().int().min(0, t('experienceInvalid')).max(80, t('experienceInvalid')),
    languages: z.array(z.string()).min(1, t('languagesRequired')),
    phone: z.string().min(1, t('phoneRequired')),
  });
}

export type DoctorProfileFormValues = z.infer<ReturnType<typeof createDoctorProfileSchema>>;
