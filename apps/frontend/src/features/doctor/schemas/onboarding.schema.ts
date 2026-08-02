import { z } from 'zod';

type Translate = (key: string, values?: Record<string, string | number | Date>) => string;

/**
 * Doctor Onboarding (Phase 4 continuation; redesigned Onboarding Redesign
 * 2026-07-21 proposal, Stage O.6): the profile step's own schema -- a
 * superset of `createDoctorProfileSchema` (adds licenseNumber, once-only).
 * `specialtyId`/`professionalRank`/`licenseExpiryDate` are required in this
 * onboarding flow specifically (product decision, Stage O.6) even though
 * the backend DTO itself marks them optional. `departmentId` is required
 * only once a Hospital (not Independent Practice) is chosen -- enforced via
 * `superRefine` below, not the field's own base validator.
 */
// Doctor Profile Redesign (2026-08-02): one work-experience timeline row --
// mirrors the backend's real `PortfolioWorkExperienceDto` validation
// exactly (organizationName/position non-empty, startDate required,
// endDate/description optional), plus a frontend-only endDate >= startDate
// check the backend doesn't need to restate (it stores raw ISO dates).
function createWorkExperienceEntrySchema(t: Translate) {
  return z
    .object({
      organizationName: z.string().min(1, t('workExperienceOrganizationRequired')),
      position: z.string().min(1, t('workExperiencePositionRequired')),
      professionalRank: z.enum(['resident', 'registrar', 'specialist', 'consultant', 'professor']).optional(),
      startDate: z.string().min(1, t('workExperienceStartDateRequired')),
      endDate: z.string().optional(),
      description: z.string().optional(),
    })
    .superRefine((entry, ctx) => {
      if (entry.endDate && entry.startDate && entry.endDate < entry.startDate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: t('workExperienceEndDateInvalid') });
      }
    });
}

export function createOnboardingProfileSchema(t: Translate) {
  return z
    .object({
      licenseNumber: z.string().min(2, t('licenseNumberRequired')),
      specialtyId: z.string().min(1, t('specialtyRequired')),
      biography: z.string().max(500, t('biographyTooLong', { max: 500 })).optional(),
      yearsOfExperience: z.coerce.number().int().min(0, t('experienceInvalid')).max(80, t('experienceInvalid')).optional(),
      languages: z.array(z.string()).min(1, t('languagesRequired')),
      // Doctor Profile Redesign (2026-08-02): same shape/validation as `languages`.
      insuranceProviders: z.array(z.string()).optional(),
      consultationFeeAmount: z.coerce.number().min(0, t('feeInvalid')).optional(),
      hospitalId: z.string().optional(),
      professionalRank: z.enum(['resident', 'registrar', 'specialist', 'consultant', 'professor'], {
        required_error: t('professionalRankRequired'),
      }),
      licenseExpiryDate: z.string().min(1, t('licenseExpiryDateRequired')),
      departmentId: z.string().optional(),
      // Doctor Profile Redesign (2026-08-02): the work-history timeline backing
      // the Profile page's "Experience" section.
      workExperience: z.array(createWorkExperienceEntrySchema(t)).optional(),
    })
    .superRefine((values, ctx) => {
      if (values.hospitalId && !values.departmentId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['departmentId'], message: t('departmentRequired') });
      }
    });
}

export type OnboardingProfileFormValues = z.infer<ReturnType<typeof createOnboardingProfileSchema>>;
