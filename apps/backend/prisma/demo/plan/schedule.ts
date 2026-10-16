/**
 * Demo timeline -- slot placement on each doctor's real booking grid.
 *
 * Slots come from SchedulingModule's own `generateCandidateSlotsForDate`
 * (the exact function that materialises bookable windows for patients), fed
 * with the doctor's stored weekly hours and buffer -- so every demo
 * appointment sits on a slot the product itself would offer, never at an
 * off-grid time like 12:34.
 */
import { generateCandidateSlotsForDate } from '../../../src/modules/scheduling/application/services/generate-bookable-slots.js';
import type { EffectiveDay } from '../../../src/modules/scheduling/application/services/generate-bookable-slots.js';
import { ConsultationPricing } from '../../../src/modules/scheduling/domain/value-objects/consultation-pricing.value-object.js';
import type { CairoDay, Rng } from '../core.js';
import { MS_PER_MINUTE, addDays, cairoInstant, dayKey, utcMidnightOf, weekdayOf } from '../core.js';
import type { DemoDoctorRecord, WorkingDay } from '../load.js';

const WEEKDAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export interface Slot {
  start: Date;
  end: Date;
}

export interface TimeOff {
  day: CairoDay;
  type: 'VACATION' | 'UNAVAILABLE' | 'EXTRA_HOURS';
  hours?: { start: string; end: string };
  reason: string;
}

export class DoctorCalendar {
  private readonly slotCache = new Map<string, Slot[]>();
  private readonly busy = new Set<number>();
  private readonly timeOff = new Map<string, TimeOff>();

  constructor(readonly doctor: DemoDoctorRecord) {}

  addTimeOff(entry: TimeOff): void {
    this.timeOff.set(dayKey(entry.day), entry);
    this.slotCache.delete(dayKey(entry.day));
  }

  getTimeOff(): TimeOff[] {
    return [...this.timeOff.values()];
  }

  isTimeOff(day: CairoDay): boolean {
    const entry = this.timeOff.get(dayKey(day));
    return entry !== undefined && entry.type !== 'EXTRA_HOURS';
  }

  workingDay(day: CairoDay): WorkingDay | undefined {
    return this.doctor.workingDays.find((row) => row.dayOfWeek === WEEKDAY_NAMES[weekdayOf(day)]);
  }

  /** The pricing a window on this day is stamped with (per-weekday default, as the product does). */
  feeFor(day: CairoDay): number | null {
    const row = this.workingDay(day);
    if (!row || row.pricingType === 'FREE' || row.feeAmount === null) return null;
    return row.feeAmount;
  }

  slots(day: CairoDay): Slot[] {
    const key = dayKey(day);
    const cached = this.slotCache.get(key);
    if (cached) return cached;

    const exception = this.timeOff.get(key);
    const row = this.workingDay(day);
    let effective: EffectiveDay | undefined;
    if (exception?.type === 'EXTRA_HOURS' && exception.hours) {
      effective = { isWorkingDay: true, hours: exception.hours, breaks: row?.breaks ?? [], pricing: ConsultationPricing.free() };
    } else if (row && row.isWorkingDay && !exception) {
      effective = { isWorkingDay: true, hours: { start: row.startTime, end: row.endTime }, breaks: row.breaks, pricing: ConsultationPricing.free() };
    }

    let slots: Slot[] = [];
    if (effective) {
      // "now" an hour before the day starts: every slot of that day passes
      // the generator's min-notice / max-window filters.
      const now = new Date(cairoInstant(day, '00:00').getTime() - 60 * MS_PER_MINUTE);
      slots = generateCandidateSlotsForDate(
        utcMidnightOf(day),
        effective,
        { slotDurationMinutes: 30, bufferMinutes: this.doctor.bufferMinutes, minNoticeMinutes: 15, maxBookingWindowDays: 30 },
        now,
      ).map((candidate) => ({ start: candidate.start, end: candidate.end }));
    }
    this.slotCache.set(key, slots);
    return slots;
  }

  isFree(slot: Slot): boolean {
    return !this.busy.has(slot.start.getTime());
  }

  occupy(slot: Slot): void {
    this.busy.add(slot.start.getTime());
  }
}

/** Per-patient occupancy: no two of a patient's appointments overlap or share a 3-hour window. */
export class PatientCalendar {
  private readonly busy: Slot[] = [];

  isFree(slot: Slot): boolean {
    const margin = 3 * 60 * MS_PER_MINUTE;
    return this.busy.every((other) => slot.end.getTime() + margin <= other.start.getTime() || other.end.getTime() + margin <= slot.start.getTime());
  }

  occupy(slot: Slot): void {
    this.busy.push(slot);
  }
}

export type SlotPolicy =
  | { kind: 'past'; anchor: Date }
  | { kind: 'future'; anchor: Date }
  | { kind: 'earlierToday'; anchor: Date }
  | { kind: 'soonAfterAnchor'; anchor: Date }
  | { kind: 'laterToday'; anchor: Date }
  | { kind: 'any'; anchor: Date };

function fitsPolicy(slot: Slot, policy: SlotPolicy): boolean {
  const anchor = policy.anchor.getTime();
  const start = slot.start.getTime();
  const end = slot.end.getTime();
  switch (policy.kind) {
    case 'past':
    case 'earlierToday':
      // Over (and closed) at least 10 minutes before the anchor.
      return end + 10 * MS_PER_MINUTE <= anchor;
    case 'future':
    case 'laterToday':
    case 'any':
      // Bookable: at least the product's 15-minute notice ahead (20 for margin).
      return start >= anchor + 20 * MS_PER_MINUTE;
    case 'soonAfterAnchor':
      return start >= anchor + 20 * MS_PER_MINUTE && start <= anchor + 120 * MS_PER_MINUTE;
  }
}

export interface PlacementRequest {
  doctor: DoctorCalendar;
  patient: PatientCalendar;
  targetDay: CairoDay;
  policy: SlotPolicy;
  r: Rng;
  /** How far (days) placement may move from the target day. */
  maxShiftDays?: number;
  /** Only search forward from the target day. */
  forwardOnly?: boolean;
  /** Earliest / latest day allowed (inclusive). */
  minDay?: CairoDay;
  maxDay?: CairoDay;
  /** Within a day, prefer the earliest (or latest) fitting slot instead of a random one. */
  prefer?: 'earliest' | 'latest' | 'random';
}

function compareDay(a: CairoDay, b: CairoDay): number {
  return Date.UTC(a.year, a.month, a.day) - Date.UTC(b.year, b.month, b.day);
}

/** Finds a free on-grid slot near the target day; occupies it for both calendars. */
export function place(request: PlacementRequest): { slot: Slot; day: CairoDay } | undefined {
  const maxShift = request.maxShiftDays ?? 6;
  const offsets: number[] = [0];
  for (let shift = 1; shift <= maxShift; shift += 1) {
    offsets.push(shift);
    if (!request.forwardOnly) offsets.push(-shift);
  }
  for (const offset of offsets) {
    const day = addDays(request.targetDay, offset);
    if (request.minDay && compareDay(day, request.minDay) < 0) continue;
    if (request.maxDay && compareDay(day, request.maxDay) > 0) continue;
    if (request.doctor.isTimeOff(day)) continue;
    const candidates = request.doctor
      .slots(day)
      .filter((slot) => fitsPolicy(slot, request.policy) && request.doctor.isFree(slot) && request.patient.isFree(slot));
    if (candidates.length === 0) continue;
    const slot =
      request.prefer === 'earliest'
        ? candidates[0]
        : request.prefer === 'latest'
          ? candidates[candidates.length - 1]
          : candidates[request.r.int(0, candidates.length - 1)];
    request.doctor.occupy(slot);
    request.patient.occupy(slot);
    return { slot, day };
  }
  return undefined;
}

export { compareDay };
