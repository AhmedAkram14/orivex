export interface SchedulingRules {
  slotDurationMinutes: number;
  bufferMinutes: number;
  minNoticeMinutes: number;
  maxBookingWindowDays: number;
}

// A single global config value nobody can edit yet (the frontend's own
// SchedulingRules doc comment: "a single global default today... no
// requirement for [per-doctor overrides] exists until a real integration
// needs it"). No Prisma model, no query params -- hardcoded constants
// returned from application code, not a database row nobody can write to.
const RULES: SchedulingRules = {
  slotDurationMinutes: 30,
  bufferMinutes: 5,
  minNoticeMinutes: 60,
  maxBookingWindowDays: 30,
};

export class GetSchedulingRulesUseCase {
  async execute(): Promise<SchedulingRules> {
    return RULES;
  }
}
