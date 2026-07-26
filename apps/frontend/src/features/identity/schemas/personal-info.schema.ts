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

export type PersonalInfoFormValues = z.infer<ReturnType<typeof createPersonalInfoSchema>>;
