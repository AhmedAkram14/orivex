import { z } from 'zod';

type Translate = (key: string, values?: Record<string, string | number | Date>) => string;

/**
 * Doctor Settings Rebuild, Phase 6: a small, standalone schema for just the
 * 3 Consultation Defaults fields -- deliberately not folded into
 * `profile.schema.ts`'s much larger `createDoctorProfileSchema` (that schema
 * owns the whole Doctor Profile page's edit surface, a different form
 * entirely).
 *
 * `maxFreeSlotsPerDay`/`bufferMinutesOverride` both mirror the backend's own
 * "omit/undefined = no cap / use the platform default" contract
 * (`DoctorProfile.update()`'s `props.field !== undefined` guard,
 * `UpdateDoctorProfileRequestDto`) -- an empty input must become `undefined`,
 * not `0`, so a `z.preprocess` strips the empty string *before*
 * `z.coerce.number()` ever runs (coercing '' straight to a number would
 * silently turn "leave empty" into a real `0`, which is a materially
 * different value: 0 free slots/0 minutes buffer, not "no cap"/"use
 * default").
 */
function optionalNonNegativeInt(message: string) {
  return z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.coerce.number().int().min(0, message).optional(),
  );
}

export function createConsultationDefaultsSchema(t: Translate) {
  return z.object({
    maxFreeSlotsPerDay: optionalNonNegativeInt(t('maxFreeSlotsPerDayInvalid')),
    bufferMinutesOverride: optionalNonNegativeInt(t('bufferMinutesOverrideInvalid')),
    autoApproveFreeBookings: z.boolean(),
  });
}

export type ConsultationDefaultsFormValues = z.infer<ReturnType<typeof createConsultationDefaultsSchema>>;
