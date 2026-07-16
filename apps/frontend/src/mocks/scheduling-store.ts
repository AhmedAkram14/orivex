import type { SchedulingRules } from '@/features/scheduling/types';

/**
 * In-memory mock "backend" state for `/scheduling/*` — mirrors
 * `doctor-store.ts`'s pattern. `SchedulingRules` is operational
 * configuration (slot duration, buffer, notice window), not clinical or
 * business-outcome data, so a believable seed is appropriate here — the
 * same reasoning `seedProfile()` (Patient Portal, Phase 8) applied to
 * administrative data, distinct from the honest-empty rule for clinical
 * data.
 */
function seedRules(): SchedulingRules {
  return {
    slotDurationMinutes: 30,
    bufferMinutes: 10,
    minNoticeMinutes: 60,
    maxBookingWindowDays: 30,
  };
}

let rules: SchedulingRules = seedRules();

export function getSchedulingRules(): SchedulingRules {
  return rules;
}

/** Test-only: restores the seed state. Never called from application code. */
export function resetSchedulingStore(): void {
  rules = seedRules();
}
