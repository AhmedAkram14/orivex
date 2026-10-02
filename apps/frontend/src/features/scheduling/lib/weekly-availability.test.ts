import { describe, expect, it } from 'vitest';
import baseline from '@/features/scheduling/components/__fixtures__/weekly-availability-baseline.json';
import type { RecurringWeeklySchedule } from '@/features/scheduling/types';
import {
  applyDefaultHoursToWorkingDays,
  copyDayTo,
  expandDraft,
  isDraftDirty,
  isOverride,
  resetDayToDefault,
  summarize,
  toDraft,
  toSavePayload,
  updateDay,
  validateDraft,
} from './weekly-availability';

// The round-trip fixture (captured with the pre-redesign form): every day 9 AM - 5 PM, six days Paid 320 EGP,
// Friday Free, one break on Sunday. `unchanged`/`edited` are the exact PATCH bodies that form sent.
const fixture = baseline.fixture as RecurringWeeklySchedule;
const t = (key: string) => key;

describe('toDraft: defaults are the most common working-day values', () => {
  it('Paid 320 EGP and 9-5 are the defaults; Friday (Free) is the one custom price', () => {
    const draft = toDraft(fixture);
    expect(draft.defaults.pricing).toEqual({
      pricingType: 'paid',
      feeAmount: 320,
      feeCurrency: 'EGP',
    });
    expect(draft.defaults.hours).toEqual({ start: '09:00', end: '17:00' });
    expect(draft.days.map((entry) => entry.priceSource)).toEqual([
      'default',
      'default',
      'default',
      'default',
      'default',
      'custom',
      'default',
    ]);
    expect(draft.days.map((_, index) => isOverride(draft, index))).toEqual([
      false,
      false,
      false,
      false,
      false,
      true,
      false,
    ]);
  });

  it('a day off does not count toward the defaults', () => {
    const schedule = fixture.map((day) =>
      day.dayOfWeek === 'saturday' ||
      day.dayOfWeek === 'sunday' ||
      day.dayOfWeek === 'monday' ||
      day.dayOfWeek === 'tuesday'
        ? { ...day, isWorkingDay: false }
        : day,
    );
    // Working: Wed, Thu (Paid 320) and Fri (Free) -> Paid 320 still wins.
    expect(toDraft(schedule).defaults.pricing.pricingType).toBe('paid');
  });
});

describe('the save payload', () => {
  it('unchanged: byte-identical to what the pre-redesign form sent', () => {
    expect(JSON.stringify(toSavePayload(toDraft(fixture), t))).toBe(baseline.unchanged);
    expect(isDraftDirty(toDraft(fixture), fixture)).toBe(false);
  });

  it("Friday Paid 450 and a Monday break: byte-identical to the old form's edit, and only those fields differ", () => {
    let draft = toDraft(fixture);
    draft = updateDay(draft, 5, (entry) => ({
      priceSource: 'custom',
      day: { ...entry.day, pricing: { ...entry.day.pricing, pricingType: 'paid', feeAmount: 450 } },
    }));
    draft = updateDay(draft, 1, (entry) => ({
      ...entry,
      day: { ...entry.day, breaks: [{ start: '13:00', end: '14:00' }] },
    }));
    const payload = toSavePayload(draft, t);
    expect(JSON.stringify(payload)).toBe(baseline.edited);

    const before = JSON.parse(baseline.unchanged) as RecurringWeeklySchedule;
    const changed = payload.flatMap((day, index) =>
      (['isWorkingDay', 'hours', 'breaks', 'pricing'] as const)
        .filter((field) => JSON.stringify(day[field]) !== JSON.stringify(before[index]![field]))
        .map((field) => `${day.dayOfWeek}.${field}`),
    );
    expect(changed).toEqual(['monday.breaks', 'friday.pricing']);
    expect(isDraftDirty(draft, fixture)).toBe(true);
  });

  it('a change to the default price reaches every day that follows it, and only those', () => {
    const draft = {
      ...toDraft(fixture),
      defaults: {
        ...toDraft(fixture).defaults,
        pricing: { pricingType: 'paid' as const, feeAmount: 350, feeCurrency: 'EGP' },
      },
    };
    const days = expandDraft(draft);
    expect(days.filter((day) => day.pricing.feeAmount === 350)).toHaveLength(6);
    expect(days[5]!.pricing.pricingType).toBe('free');
  });

  it('an off day keeps its own hours, breaks and price in the payload', () => {
    const schedule = fixture.map((day) =>
      day.dayOfWeek === 'saturday'
        ? { ...day, isWorkingDay: false, hours: { start: '10:00', end: '12:00' } }
        : day,
    );
    const saturday = toSavePayload(toDraft(schedule), t)[6]!;
    expect(saturday).toMatchObject({
      isWorkingDay: false,
      hours: { start: '10:00', end: '12:00' },
    });
  });
});

describe('summary', () => {
  it('counts working days, bookable hours (breaks taken out) and days with their own price', () => {
    // 7 days x 8 h, minus Sunday's 1 h break = 55 h; one custom price (Friday).
    expect(summarize(toDraft(fixture))).toEqual({
      workingDays: 7,
      hoursPerWeek: 55,
      customPriceDays: 1,
    });
  });
});

describe('validation: the save rules, placed where they can be fixed', () => {
  it('end before start, a break outside the hours, overlapping breaks: under that day', () => {
    let draft = toDraft(fixture);
    draft = updateDay(draft, 0, (entry) => ({
      ...entry,
      day: { ...entry.day, hours: { start: '17:00', end: '09:00' } },
    }));
    draft = updateDay(draft, 1, (entry) => ({
      ...entry,
      day: { ...entry.day, breaks: [{ start: '18:00', end: '18:30' }] },
    }));
    draft = updateDay(draft, 2, (entry) => ({
      ...entry,
      day: {
        ...entry.day,
        breaks: [
          { start: '12:00', end: '13:00' },
          { start: '12:30', end: '13:30' },
        ],
      },
    }));
    const errors = validateDraft(draft, t);
    expect(errors.days.get(0)).toContain('endAfterStart');
    expect(errors.days.get(1)).toContain('breakOutsideHours');
    expect(errors.days.get(2)).toContain('breaksOverlap');
    expect(errors.defaults).toEqual([]);
  });

  it('a Paid default with no fee is said once, on the defaults bar', () => {
    const draft = {
      ...toDraft(fixture),
      defaults: {
        ...toDraft(fixture).defaults,
        pricing: { pricingType: 'paid' as const, feeAmount: null, feeCurrency: 'EGP' },
      },
    };
    const errors = validateDraft(draft, t);
    expect(errors.defaults).toEqual(['feeAmountRequired']);
    expect(errors.days.size).toBe(0);
  });
});

describe('edits', () => {
  it('Apply to all working days sets the default hours on working days only', () => {
    const schedule = fixture.map((day) =>
      day.dayOfWeek === 'saturday'
        ? { ...day, isWorkingDay: false, hours: { start: '10:00', end: '12:00' } }
        : day,
    );
    let draft = toDraft(schedule);
    draft = { ...draft, defaults: { ...draft.defaults, hours: { start: '08:00', end: '16:00' } } };
    const days = expandDraft(applyDefaultHoursToWorkingDays(draft));
    expect(days.filter((day) => day.hours.start === '08:00')).toHaveLength(6);
    expect(days[6]!.hours).toEqual({ start: '10:00', end: '12:00' });
  });

  it('Copy to copies working state, hours, breaks and price', () => {
    const days = expandDraft(copyDayTo(toDraft(fixture), 0, ['monday', 'friday']));
    expect(days[1]!.breaks).toEqual([{ start: '13:00', end: '14:00' }]);
    expect(days[5]!.pricing).toEqual({ pricingType: 'paid', feeAmount: 320, feeCurrency: 'EGP' });
  });

  it('Reset to default restores the default hours and price, and keeps the breaks', () => {
    let draft = toDraft(fixture);
    draft = updateDay(draft, 5, (entry) => ({
      ...entry,
      day: {
        ...entry.day,
        hours: { start: '10:00', end: '14:00' },
        breaks: [{ start: '11:00', end: '11:30' }],
      },
    }));
    const friday = expandDraft(resetDayToDefault(draft, 5))[5]!;
    expect(friday.hours).toEqual({ start: '09:00', end: '17:00' });
    expect(friday.pricing).toEqual({ pricingType: 'paid', feeAmount: 320, feeCurrency: 'EGP' });
    expect(friday.breaks).toEqual([{ start: '11:00', end: '11:30' }]);
  });
});
