import { z } from 'zod';

type Translate = (key: string, values?: Record<string, string | number | Date>) => string;

/**
 * Doctor Profile Redesign follow-up (2026-08-02): one work-experience
 * timeline row, editable from the Profile page itself (not just onboarding)
 * -- mirrors `onboarding.schema.ts`'s identical entry schema exactly (same
 * backend `PortfolioWorkExperienceDto` validation), duplicated here per this
 * codebase's existing convention of small per-feature schema duplication
 * over cross-file imports between onboarding and profile-edit.
 */
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

// Doctor Profile Redesign follow-up (2026-08-02): matches the backend's
// real `PortfolioPublicationDto`/`PortfolioAwardDto` update shape exactly --
// title required, reference/issuingBody optional, no dates (the update DTO
// never accepts publishedAt/awardedAt, only registration-time creation
// would, and this app has no such creation path yet).
function createPublicationEntrySchema(t: Translate) {
  return z.object({
    title: z.string().min(1, t('publicationTitleRequired')),
    reference: z.string().optional(),
  });
}

function createAwardEntrySchema(t: Translate) {
  return z.object({
    title: z.string().min(1, t('awardTitleRequired')),
    issuingBody: z.string().optional(),
  });
}

export function createDoctorProfileSchema(t: Translate) {
  return z.object({
    specialtyId: z.string().min(1, t('specialtyRequired')),
    biography: z.string().max(500, t('biographyTooLong', { max: 500 })).optional(),
    yearsOfExperience: z.coerce.number().int().min(0, t('experienceInvalid')).max(80, t('experienceInvalid')).optional(),
    languages: z.array(z.string()).min(1, t('languagesRequired')),
    workExperience: z.array(createWorkExperienceEntrySchema(t)).optional(),
    publications: z.array(createPublicationEntrySchema(t)).optional(),
    awards: z.array(createAwardEntrySchema(t)).optional(),
  });
}

export type DoctorProfileFormValues = z.infer<ReturnType<typeof createDoctorProfileSchema>>;
