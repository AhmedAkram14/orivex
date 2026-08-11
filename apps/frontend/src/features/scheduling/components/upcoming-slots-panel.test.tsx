import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { server } from '@/mocks/server';
import {
  getUpcomingSlots,
  markAvailabilityWindowBooked,
  resetSchedulingStore,
  updateDoctorAvailability,
} from '@/mocks/scheduling-store';
import type { RecurringWeeklySchedule, WeekDay } from '@/features/scheduling/types';

import { UpcomingSlotsPanel } from './upcoming-slots-panel';

const DOCTOR_ID = 'doctor-profile-1';

/**
 * A deterministic, weekday-independent 7-day-working Paid template -- every
 * day is guaranteed bookable and Paid regardless of which real weekday the
 * test suite happens to run on (the seeded demo schedule has non-working
 * Free days, which would make these tests flaky if relied on directly). A
 * narrow, late-evening window (never in the past relative to `minNoticeMinutes`
 * for any future day, and deliberately only 1 generated slot/day, not a
 * whole day's worth) keeps "Upcoming Slots"'s real 60-day fetch window from
 * rendering thousands of rows in this test.
 */
function seedAllDaysPaid(): void {
  const allDays: WeekDay[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const schedule: RecurringWeeklySchedule = allDays.map((dayOfWeek) => ({
    dayOfWeek,
    isWorkingDay: true,
    hours: { start: '23:00', end: '23:40' },
    breaks: [],
    pricing: { pricingType: 'paid', feeAmount: 500, feeCurrency: 'EGP' },
  }));
  updateDoctorAvailability(schedule);
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetSchedulingStore();
});
afterAll(() => server.close());

/**
 * Consultation Pricing Redesign: the doctor-facing "Upcoming Slots"
 * management list -- generated, not-yet-booked windows, individually
 * repriceable. `GET /scheduling/upcoming-slots` only ever returns `open`
 * windows (the real `SchedulingController.getUpcomingSlots()` filters to
 * `AvailabilityWindowStatus.Open` server-side) -- a booked slot is never
 * listed here at all, which is the strongest form of "protect booked
 * slots": there's no row to click Edit on in the first place.
 */
describe('UpcomingSlotsPanel', () => {
  it("shows an open slot's real price and an Edit action", async () => {
    seedAllDaysPaid();
    renderWithProviders(<UpcomingSlotsPanel />);

    expect((await screen.findAllByText('Available')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/EGP/).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Edit pricing' }).length).toBeGreaterThan(0);
  });

  it('removes a slot from the list entirely once it has been booked -- never editable once booked', async () => {
    seedAllDaysPaid();
    const [firstSlot] = getUpcomingSlots(DOCTOR_ID);
    const slotCountBefore = getUpcomingSlots(DOCTOR_ID).length;
    markAvailabilityWindowBooked(firstSlot.id);

    renderWithProviders(<UpcomingSlotsPanel />);
    await screen.findAllByText('Available');

    const remaining = getUpcomingSlots(DOCTOR_ID);
    expect(remaining.some((window) => window.id === firstSlot.id)).toBe(false);
    expect(remaining.length).toBe(slotCountBefore - 1);
  });

  it("lets the doctor override an open slot's pricing to Free without touching the template", async () => {
    seedAllDaysPaid();
    renderWithProviders(<UpcomingSlotsPanel />);

    const editButtons = await screen.findAllByRole('button', { name: 'Edit pricing' });
    await userEvent.click(editButtons[0]);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Free' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await vi.waitFor(() => {
      const windows = getUpcomingSlots(DOCTOR_ID);
      expect(windows.some((window) => window.consultationType === 'free')).toBe(true);
    });

    // The template default itself is untouched -- only this one slot's
    // override changed (the rest of the day's slots are still Paid).
    const stillPaidCount = getUpcomingSlots(DOCTOR_ID).filter((window) => window.consultationType === 'paid').length;
    expect(stillPaidCount).toBeGreaterThan(0);
  });
});
