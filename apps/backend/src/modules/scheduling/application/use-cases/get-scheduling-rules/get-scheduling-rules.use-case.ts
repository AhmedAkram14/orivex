import type { GetDoctorProfileByIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';

export interface SchedulingRules {
  slotDurationMinutes: number;
  bufferMinutes: number;
  minNoticeMinutes: number;
  maxBookingWindowDays: number;
}

// Consultation Defaults (Doctor Settings Rebuild, Phase 1): bufferMinutes is
// now partially editable -- a doctor with `DoctorProfile.bufferMinutesOverride`
// set gets their own value instead of this flat default. Every other field
// stays a single global constant nobody can edit (no requirement for a
// per-doctor override on those exists yet). No Prisma model of its own --
// still hardcoded constants returned from application code, just no longer
// unconditionally so for bufferMinutes.
const DEFAULT_BUFFER_MINUTES = 5;

const RULES: SchedulingRules = {
  slotDurationMinutes: 30,
  bufferMinutes: DEFAULT_BUFFER_MINUTES,
  minNoticeMinutes: 15,
  maxBookingWindowDays: 30,
};

export class GetSchedulingRulesUseCase {
  constructor(private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase) {}

  // `doctorId` is optional: callers with no specific doctor in view (or that
  // can't resolve one, e.g. a patient account) get the flat global rules
  // unchanged -- same response shape and values as before this phase. When
  // given, only `bufferMinutes` varies per doctor; a doctor profile that
  // can't be found (or has no override set) falls back to the same global
  // default rather than throwing, since this is a permissive read, not a
  // resource lookup.
  async execute(doctorId?: string): Promise<SchedulingRules> {
    if (!doctorId) {
      return RULES;
    }

    const profile = await this.getDoctorProfileByIdUseCase.execute({ doctorProfileId: doctorId });
    const bufferMinutes = profile?.getBufferMinutesOverride() ?? RULES.bufferMinutes;

    return { ...RULES, bufferMinutes };
  }
}
