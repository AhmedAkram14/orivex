import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { PATIENT_PATHS } from '@/features/patient/api/paths';
import { env } from '@/shared/lib/env';
import { server } from '@/mocks/server';
import { bookAppointment, resetPatientStore, setPatientVerified } from '@/mocks/patient-store';
import { addDoctorException, getDoctorAvailability, resetSchedulingStore, updateDoctorAvailability } from '@/mocks/scheduling-store';

import { RescheduleAction } from './reschedule-action';

const DOCTOR_ID = 'doctor-profile-1';

/** Matches `resolve-day.ts`'s own local-date `toDateKey` format exactly. */
function todayDateKey(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Forces every working day's default pricing to Free -- the seeded demo doctor otherwise defaults to Paid (500 EGP) on its working days, which the Paid-path test forces explicitly instead (`makeAllDaysPaid`). */
function makeAllDaysFree(): void {
  updateDoctorAvailability(
    getDoctorAvailability().map((day) => ({
      ...day,
      pricing: { pricingType: 'free', feeAmount: null, feeCurrency: null },
    })),
  );
}

/**
 * Forces every single day of the week -- including whichever real weekday
 * this suite happens to run on -- to be a real Paid working day. The seeded
 * demo doctor only defaults to Paid on its own working days (Sun-Thu); an
 * `extra-hours` exception alone (see `resolveDayForDate`) only extends that
 * day's *hours*, it never carries its own pricing, so on a real Friday/
 * Saturday it would still resolve to that weekday's own Free template.
 * Setting `isWorkingDay: true` here removes that dependency entirely --
 * every day already has real 09:00-17:00 hours in the seed, this just makes
 * all seven of them Paid-and-open regardless of which real day it is.
 */
function makeAllDaysPaid(): void {
  updateDoctorAvailability(
    getDoctorAvailability().map((day) => ({
      ...day,
      isWorkingDay: true,
      pricing: { pricingType: 'paid', feeAmount: 500, feeCurrency: 'EGP' },
    })),
  );
}

function findSlotButton() {
  const excludedNames = ['Today', 'Previous day', 'Next day'];
  return screen
    .queryAllByRole('button')
    .find((button) => !excludedNames.includes(button.getAttribute('aria-label') ?? button.textContent ?? ''));
}

/** Seeds a real, reschedule-eligible (Requested) appointment via the same mock booking path `BookingFlow`'s own tests use -- never a fabricated Appointment literal. A future date, not a fixed one -- a fixed past date would (correctly) be excluded by the real "is this appointment still upcoming" date check. */
function seedReschedulableAppointment() {
  const futureWindowStart = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  return bookAppointment({ doctorId: DOCTOR_ID, availabilityWindowId: `${DOCTOR_ID}::${futureWindowStart}` });
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetSchedulingStore();
  resetPatientStore();
});
afterAll(() => server.close());

describe('RescheduleAction / RescheduleFlow', () => {
  it('opens the reschedule dialog and shows the same doctor\'s real, future bookable slots', async () => {
    addDoctorException({ date: todayDateKey(), type: 'extra-hours', hours: { start: '00:00', end: '23:30' } });
    setPatientVerified(true);
    const appointment = seedReschedulableAppointment();
    renderWithProviders(<RescheduleAction appointmentId={appointment.id} doctorId={DOCTOR_ID} />);

    await userEvent.click(screen.getByRole('button', { name: 'Reschedule' }));
    expect(await screen.findByText('Reschedule appointment')).toBeInTheDocument();

    const slotButton = await vi.waitFor(() => {
      const slot = findSlotButton();
      if (!slot) throw new Error('no slot yet');
      return slot;
    });
    expect(slotButton).toBeInTheDocument();
  });

  it('confirms a Free new slot and shows success directly, with no payment step', async () => {
    makeAllDaysFree();
    addDoctorException({ date: todayDateKey(), type: 'extra-hours', hours: { start: '00:00', end: '23:30' } });
    setPatientVerified(true);
    const appointment = seedReschedulableAppointment();
    renderWithProviders(<RescheduleAction appointmentId={appointment.id} doctorId={DOCTOR_ID} />);

    await userEvent.click(screen.getByRole('button', { name: 'Reschedule' }));
    const slotButton = await vi.waitFor(() => {
      const slot = findSlotButton();
      if (!slot) throw new Error('no slot yet');
      return slot;
    });
    await userEvent.click(slotButton);
    await userEvent.click(await screen.findByRole('button', { name: 'Confirm new time' }));

    expect(await screen.findByText('Your appointment has been moved to the new time.')).toBeInTheDocument();
    expect(screen.queryByText('Complete payment to confirm your new time')).not.toBeInTheDocument();
  });

  it('continues into the real payment step for a Paid new slot instead of showing success', async () => {
    // Forces a real Paid price regardless of which real weekday this suite
    // runs on (see `makeAllDaysPaid`'s own doc comment).
    makeAllDaysPaid();
    addDoctorException({ date: todayDateKey(), type: 'extra-hours', hours: { start: '00:00', end: '23:30' } });
    setPatientVerified(true);
    const appointment = seedReschedulableAppointment();
    renderWithProviders(<RescheduleAction appointmentId={appointment.id} doctorId={DOCTOR_ID} />);

    await userEvent.click(screen.getByRole('button', { name: 'Reschedule' }));
    const slotButton = await vi.waitFor(() => {
      const slot = findSlotButton();
      if (!slot) throw new Error('no slot yet');
      return slot;
    });
    await userEvent.click(slotButton);
    await userEvent.click(await screen.findByRole('button', { name: 'Confirm new time' }));

    expect(await screen.findByText('Complete payment to confirm your new time')).toBeInTheDocument();
    expect(screen.queryByText('Your appointment has been moved to the new time.')).not.toBeInTheDocument();
  });

  // The real optimistic-locking conflict (docs: 409) -- the chosen slot was
  // taken by someone else between the grid loading and confirm being
  // pressed. Must never silently fail or crash; offers a real "go back to a
  // freshly refetched grid" recovery, same UX BookingFlow's own conflict test
  // asserts.
  it('shows the real slot-conflict error and offers to go back, never a generic message', async () => {
    addDoctorException({ date: todayDateKey(), type: 'extra-hours', hours: { start: '00:00', end: '23:30' } });
    setPatientVerified(true);
    const appointment = seedReschedulableAppointment();
    server.use(
      http.patch(`${env.apiBaseUrl}${PATIENT_PATHS.appointment(appointment.id)}`, () =>
        HttpResponse.json(
          { error: { code: 'CONFLICT', message: 'no longer available', requestId: 'test', timestamp: new Date().toISOString() } },
          { status: 409 },
        ),
      ),
    );
    renderWithProviders(<RescheduleAction appointmentId={appointment.id} doctorId={DOCTOR_ID} />);

    await userEvent.click(screen.getByRole('button', { name: 'Reschedule' }));
    const slotButton = await vi.waitFor(() => {
      const slot = findSlotButton();
      if (!slot) throw new Error('no slot yet');
      return slot;
    });
    await userEvent.click(slotButton);
    await userEvent.click(await screen.findByRole('button', { name: 'Confirm new time' }));

    expect(await screen.findByText('This slot is no longer available. Please choose another time.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm new time' })).not.toBeInTheDocument();
  });

  // The real domain-invalid-state error (422) -- e.g. the appointment was
  // already rescheduled or cancelled in another tab between opening this
  // dialog and confirming. Distinct from the 409 conflict: there is no
  // "back to select" recovery here, only an honest message.
  it('shows a distinct real error when the appointment can no longer be rescheduled from its current state', async () => {
    addDoctorException({ date: todayDateKey(), type: 'extra-hours', hours: { start: '00:00', end: '23:30' } });
    setPatientVerified(true);
    const appointment = seedReschedulableAppointment();
    server.use(
      http.patch(`${env.apiBaseUrl}${PATIENT_PATHS.appointment(appointment.id)}`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'VALIDATION_FAILED',
              message: 'cannot be rescheduled from its current status',
              requestId: 'test',
              timestamp: new Date().toISOString(),
            },
          },
          { status: 422 },
        ),
      ),
    );
    renderWithProviders(<RescheduleAction appointmentId={appointment.id} doctorId={DOCTOR_ID} />);

    await userEvent.click(screen.getByRole('button', { name: 'Reschedule' }));
    const slotButton = await vi.waitFor(() => {
      const slot = findSlotButton();
      if (!slot) throw new Error('no slot yet');
      return slot;
    });
    await userEvent.click(slotButton);
    await userEvent.click(await screen.findByRole('button', { name: 'Confirm new time' }));

    expect(
      await screen.findByText('This appointment can no longer be rescheduled — it may have already been changed elsewhere.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
  });

  // Real 404 -- unreachable in normal UI (the button only ever shows on the
  // caller's own appointment), but the API call could still 404 (e.g. the
  // appointment was deleted server-side in some other flow); must still
  // show a real, distinct message rather than crashing or silently failing.
  it('shows a distinct real error when the appointment cannot be found', async () => {
    addDoctorException({ date: todayDateKey(), type: 'extra-hours', hours: { start: '00:00', end: '23:30' } });
    setPatientVerified(true);
    const appointment = seedReschedulableAppointment();
    server.use(
      http.patch(`${env.apiBaseUrl}${PATIENT_PATHS.appointment(appointment.id)}`, () =>
        HttpResponse.json(
          { error: { code: 'NOT_FOUND', message: 'not found', requestId: 'test', timestamp: new Date().toISOString() } },
          { status: 404 },
        ),
      ),
    );
    renderWithProviders(<RescheduleAction appointmentId={appointment.id} doctorId={DOCTOR_ID} />);

    await userEvent.click(screen.getByRole('button', { name: 'Reschedule' }));
    const slotButton = await vi.waitFor(() => {
      const slot = findSlotButton();
      if (!slot) throw new Error('no slot yet');
      return slot;
    });
    await userEvent.click(slotButton);
    await userEvent.click(await screen.findByRole('button', { name: 'Confirm new time' }));

    expect(
      await screen.findByText('This appointment could not be found. It may have already been changed elsewhere.'),
    ).toBeInTheDocument();
  });
});
