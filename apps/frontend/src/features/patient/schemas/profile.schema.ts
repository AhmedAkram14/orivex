import { z } from 'zod';

type Translate = (key: string, values?: Record<string, string | number | Date>) => string;

const RELATIONSHIPS = ['parent', 'spouse', 'sibling', 'child', 'guardian', 'other'] as const;
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

/**
 * Onboarding Redesign (2026-07-21 proposal, Stage O.3/O.7): the Patient
 * Medical Profile editor's own schema. `dateOfBirth` is deliberately absent
 * -- it moved to the shared Personal Info step (`PATCH /accounts/me`, §0a),
 * this form only ever submits `PatientProfileUpdateRequestDto`'s own fields.
 * `relationship` is now a fixed enum (the backend validates it as such,
 * Stage O.3), not free text. `bloodType`/`professionalRank`-style enum
 * fields and `insuranceProviderId` are all optional per the backend DTO;
 * `allergies`/`chronicDiseases` stay plain free text (finalized product
 * decision, §11).
 */
export function createPatientProfileSchema(t: Translate) {
  return z.object({
    bloodType: z.enum(BLOOD_TYPES).optional(),
    allergies: z.string().max(2000, t('allergiesTooLong', { max: 2000 })).optional(),
    chronicDiseases: z.string().max(2000, t('chronicDiseasesTooLong', { max: 2000 })).optional(),
    insuranceProviderId: z.string().optional(),
    emergencyContacts: z
      .array(
        z.object({
          id: z.string().optional(),
          name: z.string().min(1, t('contactNameRequired')),
          relationship: z.enum(RELATIONSHIPS, { required_error: t('contactRelationshipRequired') }),
          phoneNumber: z.string().min(1, t('contactPhoneRequired')),
        }),
      )
      .max(5, t('contactsTooMany', { max: 5 })),
  });
}

export type PatientProfileFormValues = z.infer<ReturnType<typeof createPatientProfileSchema>>;
