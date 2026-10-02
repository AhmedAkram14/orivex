import { createWorkingHoursSchema } from '@/features/scheduling/schemas/working-hours.schema';
import type {
  ConsultationPricing,
  RecurringWeeklySchedule,
  TimeRange,
  WeekDay,
  WorkingHoursDay,
} from '@/features/scheduling/types';
import { toMinutes } from '@/features/scheduling/utils/time';

/**
 * The Weekly Availability editor's working model. The API keeps an explicit price, hours and breaks on every day
 * (`RecurringWeeklySchedule`); the editor shows them as shared DEFAULTS plus per-day overrides, so the one day that
 * differs stands out. Defaults exist only in the editor: on save every day is expanded back to its explicit values,
 * through the same validation and normalisation as before, so the wire payload has exactly the old shape.
 */

/** A day follows the default price, or carries its own. (Hours are compared by value; there is no hours link.) */
export type PriceSource = 'default' | 'custom';

export interface DayDraft {
  /** The day exactly as loaded (its own pricing is kept even while it follows the default). */
  day: WorkingHoursDay;
  priceSource: PriceSource;
}

export interface WeeklyDraft {
  defaults: { pricing: ConsultationPricing; hours: TimeRange };
  days: DayDraft[];
}

type Translate = (key: string, values?: Record<string, string | number>) => string;

const FALLBACK_HOURS: TimeRange = { start: '09:00', end: '17:00' };

/**
 * Two prices are the same only when every field the API sends matches exactly, so a day that follows the default
 * saves byte-for-byte what it loaded with. (Free days carry no fee, so they are all one price.)
 */
export function pricingKey(pricing: ConsultationPricing): string {
  return pricing.pricingType === 'free'
    ? 'free'
    : `paid|${pricing.feeAmount ?? ''}|${pricing.feeCurrency ?? ''}`;
}

export function sameHours(a: TimeRange, b: TimeRange): boolean {
  return a.start === b.start && a.end === b.end;
}

/** The value most days share (ties go to the earliest day in the week); `undefined` for an empty list. */
function mostCommon<T>(values: T[], key: (value: T) => string): T | undefined {
  const counts = new Map<string, { value: T; count: number }>();
  for (const value of values) {
    const entry = counts.get(key(value));
    if (entry) entry.count += 1;
    else counts.set(key(value), { value, count: 1 });
  }
  let best: { value: T; count: number } | undefined;
  for (const entry of counts.values()) if (!best || entry.count > best.count) best = entry;
  return best?.value;
}

const cloneDay = (day: WorkingHoursDay): WorkingHoursDay => ({
  ...day,
  hours: { ...day.hours },
  breaks: day.breaks.map((range) => ({ ...range })),
  pricing: { ...day.pricing },
});

/** Opens the editor: the defaults are the most common price and hours across the working days. */
export function toDraft(schedule: RecurringWeeklySchedule): WeeklyDraft {
  const working = schedule.filter((day) => day.isWorkingDay);
  const source = working.length > 0 ? working : schedule;
  const pricing = mostCommon(
    source.map((day) => day.pricing),
    pricingKey,
  ) ?? { pricingType: 'free', feeAmount: null, feeCurrency: null };
  const hours =
    mostCommon(
      source.map((day) => day.hours),
      (range) => `${range.start}-${range.end}`,
    ) ?? FALLBACK_HOURS;
  return {
    defaults: { pricing: { ...pricing }, hours: { ...hours } },
    days: schedule.map((day) => ({
      day: cloneDay(day),
      priceSource: pricingKey(day.pricing) === pricingKey(pricing) ? 'default' : 'custom',
    })),
  };
}

/** The price a day saves with. */
export function effectivePricing(draft: WeeklyDraft, index: number): ConsultationPricing {
  const entry = draft.days[index]!;
  return entry.priceSource === 'default' ? draft.defaults.pricing : entry.day.pricing;
}

/** Back to the API's per-day shape: every day with its explicit hours, breaks and price. */
export function expandDraft(draft: WeeklyDraft): RecurringWeeklySchedule {
  return draft.days.map((entry, index) => ({
    ...entry.day,
    hours: { ...entry.day.hours },
    breaks: entry.day.breaks.map((range) => ({ ...range })),
    pricing: { ...effectivePricing(draft, index) },
  }));
}

/**
 * The exact save payload -- the same steps the pre-redesign form ran on submit: the schema parse (which fixes key
 * order and drops nothing the API takes), then the pricing normalisation (Free sends no fee; Paid with no currency
 * defaults to EGP, Egypt V1 being single-currency).
 */
export function toSavePayload(draft: WeeklyDraft, t: Translate): RecurringWeeklySchedule {
  const parsed = createWorkingHoursSchema(t).parse({ days: expandDraft(draft) });
  return parsed.days.map((day) => ({
    ...day,
    pricing:
      day.pricing.pricingType === 'free'
        ? { pricingType: 'free', feeAmount: null, feeCurrency: null }
        : {
            ...day.pricing,
            feeCurrency: day.pricing.feeCurrency?.trim() ? day.pricing.feeCurrency : 'EGP',
          },
  })) as RecurringWeeklySchedule;
}

/** Whether anything that would be saved differs from what was loaded. */
export function isDraftDirty(draft: WeeklyDraft, original: RecurringWeeklySchedule): boolean {
  return JSON.stringify(expandDraft(draft)) !== JSON.stringify(toDraftBaseline(original));
}

const toDraftBaseline = (schedule: RecurringWeeklySchedule) => expandDraft(toDraft(schedule));

/** A working day whose hours or price differ from the defaults (the row's accent bar). */
export function isOverride(draft: WeeklyDraft, index: number): boolean {
  const entry = draft.days[index]!;
  return (
    entry.day.isWorkingDay &&
    (!sameHours(entry.day.hours, draft.defaults.hours) || entry.priceSource === 'custom')
  );
}

/** Bookable minutes on a day: its hours minus the parts of its breaks inside them. */
export function workingMinutes(day: WorkingHoursDay): number {
  if (!day.isWorkingDay) return 0;
  const start = toMinutes(day.hours.start);
  const end = toMinutes(day.hours.end);
  if (end <= start) return 0;
  const breaks = day.breaks.reduce((sum, range) => {
    const from = Math.max(start, toMinutes(range.start));
    const to = Math.min(end, toMinutes(range.end));
    return sum + Math.max(0, to - from);
  }, 0);
  return end - start - breaks;
}

export interface DraftSummary {
  workingDays: number;
  hoursPerWeek: number;
  customPriceDays: number;
}

export function summarize(draft: WeeklyDraft): DraftSummary {
  const working = draft.days.filter((entry) => entry.day.isWorkingDay);
  return {
    workingDays: working.length,
    hoursPerWeek: draft.days.reduce((sum, entry) => sum + workingMinutes(entry.day), 0) / 60,
    customPriceDays: working.filter((entry) => entry.priceSource === 'custom').length,
  };
}

export interface DraftErrors {
  /** Messages about the default price (e.g. Paid with no fee) -- shown once, on the defaults bar. */
  defaults: string[];
  /** Messages per day, by index, shown under that day's row. */
  days: Map<number, string[]>;
}

/** The same rules as the save (the existing schema), mapped to where the doctor can fix them. */
export function validateDraft(draft: WeeklyDraft, t: Translate): DraftErrors {
  const errors: DraftErrors = { defaults: [], days: new Map() };
  const result = createWorkingHoursSchema(t).safeParse({ days: expandDraft(draft) });
  if (result.success) return errors;
  for (const issue of result.error.issues) {
    const [root, index, field] = issue.path;
    if (root !== 'days' || typeof index !== 'number') continue;
    const onDefaultPrice = field === 'pricing' && draft.days[index]?.priceSource === 'default';
    const bucket = onDefaultPrice ? errors.defaults : (errors.days.get(index) ?? []);
    if (!bucket.includes(issue.message)) bucket.push(issue.message);
    if (!onDefaultPrice) errors.days.set(index, bucket);
  }
  return errors;
}

export function hasErrors(errors: DraftErrors): boolean {
  return errors.defaults.length > 0 || errors.days.size > 0;
}

// ---- edits (each returns a new draft) ----

export function updateDay(
  draft: WeeklyDraft,
  index: number,
  change: (entry: DayDraft) => DayDraft,
): WeeklyDraft {
  return {
    ...draft,
    days: draft.days.map((entry, position) => (position === index ? change(entry) : entry)),
  };
}

export function applyDefaultHoursToWorkingDays(draft: WeeklyDraft): WeeklyDraft {
  return {
    ...draft,
    days: draft.days.map((entry) =>
      entry.day.isWorkingDay
        ? { ...entry, day: { ...entry.day, hours: { ...draft.defaults.hours } } }
        : entry,
    ),
  };
}

/** Copies one day's working state, hours, breaks and price onto other days. */
export function copyDayTo(draft: WeeklyDraft, from: number, targets: WeekDay[]): WeeklyDraft {
  const source = draft.days[from]!;
  return {
    ...draft,
    days: draft.days.map((entry) =>
      targets.includes(entry.day.dayOfWeek)
        ? {
            priceSource: source.priceSource,
            day: {
              ...entry.day,
              isWorkingDay: source.day.isWorkingDay,
              hours: { ...source.day.hours },
              breaks: source.day.breaks.map((range) => ({ ...range })),
              pricing: { ...source.day.pricing },
            },
          }
        : entry,
    ),
  };
}

/** Back to the defaults: the default hours and the default price (its breaks stay). */
export function resetDayToDefault(draft: WeeklyDraft, index: number): WeeklyDraft {
  return updateDay(draft, index, (entry) => ({
    priceSource: 'default',
    day: { ...entry.day, hours: { ...draft.defaults.hours } },
  }));
}
