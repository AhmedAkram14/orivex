import { z } from 'zod';

export function createPatientProfileSchema(t: (key: string, values?: Record<string, string | number | Date>) => string) {
  return z.object({
    dateOfBirth: z.string().optional(),
    emergencyContacts: z
      .array(
        z.object({
          id: z.string().optional(),
          name: z.string().min(1, t('contactNameRequired')),
          relationship: z.string().min(1, t('contactRelationshipRequired')),
          phoneNumber: z.string().min(1, t('contactPhoneRequired')),
        }),
      )
      .max(5, t('contactsTooMany', { max: 5 })),
  });
}

export type PatientProfileFormValues = z.infer<ReturnType<typeof createPatientProfileSchema>>;
