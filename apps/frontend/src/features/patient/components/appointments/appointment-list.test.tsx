import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import type { Appointment } from '@/features/patient/api/types';

import { AppointmentList } from './appointment-list';

function buildAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    // Always in the future relative to whenever the test runs -- a fixed
    // past date would (correctly) be excluded by the real "is this
    // appointment still upcoming" date check, exactly the bug this app
    // used to have.
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    doctorId: 'doctor-profile-1',
    doctorName: 'Dr. Karim Adel',
    specialization: 'Cardiology',
    specializationAr: null,
    status: 'requested',
    consultationType: 'free',
    consultationSessionId: null,
    paymentRequired: false,
    feeAmount: null,
    ...overrides,
  };
}

describe('AppointmentList', () => {
  it('renders a reachable "Pay now" action for a Paid, unconfirmed appointment', () => {
    const appointment = buildAppointment({
      consultationType: 'paid',
      paymentRequired: true,
      consultationSessionId: '22222222-2222-4222-8222-222222222222',
      feeAmount: { amount: 500, currency: 'EGP' },
    });

    renderWithProviders(<AppointmentList appointments={[appointment]} emptyTitle="" emptyDescription="" />);

    expect(screen.getByRole('button', { name: 'Pay now' })).toBeInTheDocument();
  });

  it('never renders a "Pay now" action for a Free or already-confirmed appointment', () => {
    const freeAppointment = buildAppointment({ consultationType: 'free', paymentRequired: false });
    const confirmedPaidAppointment = buildAppointment({
      id: '44444444-4444-4444-8444-444444444444',
      consultationType: 'paid',
      status: 'confirmed',
      paymentRequired: false,
      consultationSessionId: '33333333-3333-4333-8333-333333333333',
    });

    renderWithProviders(
      <AppointmentList appointments={[freeAppointment, confirmedPaidAppointment]} emptyTitle="" emptyDescription="" />,
    );

    expect(screen.queryByRole('button', { name: 'Pay now' })).not.toBeInTheDocument();
  });

  it('renders a reachable "View summary" action for a Completed appointment with a consultation session', () => {
    const appointment = buildAppointment({
      status: 'completed',
      consultationSessionId: '55555555-5555-4555-8555-555555555555',
    });

    renderWithProviders(<AppointmentList appointments={[appointment]} emptyTitle="" emptyDescription="" />);

    expect(screen.getByRole('button', { name: 'View summary' })).toBeInTheDocument();
  });

  // Patient-Facing Reschedule (Phase 3 Step 2): only a still-Requested or
  // Confirmed appointment can actually be rescheduled server-side -- eligible
  // for either status, and additive alongside whatever else that status
  // already shows (a Paid-and-unpaid Requested appointment shows both
  // "Pay now" and "Reschedule").
  it('renders a reachable "Reschedule" action for a Requested appointment', () => {
    const appointment = buildAppointment({ status: 'requested' });

    renderWithProviders(<AppointmentList appointments={[appointment]} emptyTitle="" emptyDescription="" />);

    expect(screen.getByRole('button', { name: 'Reschedule' })).toBeInTheDocument();
  });

  it('renders "Reschedule" alongside "Pay now" for a Paid, unconfirmed appointment', () => {
    const appointment = buildAppointment({
      status: 'requested',
      consultationType: 'paid',
      paymentRequired: true,
      feeAmount: { amount: 500, currency: 'EGP' },
    });

    renderWithProviders(<AppointmentList appointments={[appointment]} emptyTitle="" emptyDescription="" />);

    expect(screen.getByRole('button', { name: 'Pay now' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reschedule' })).toBeInTheDocument();
  });

  it('renders a reachable "Reschedule" action for a Confirmed appointment', () => {
    const appointment = buildAppointment({ status: 'confirmed' });

    renderWithProviders(<AppointmentList appointments={[appointment]} emptyTitle="" emptyDescription="" />);

    expect(screen.getByRole('button', { name: 'Reschedule' })).toBeInTheDocument();
  });

  it('never renders "Reschedule" for a Rescheduled, Cancelled, No-show, or Completed appointment', () => {
    const appointments = [
      buildAppointment({ id: 'a1', status: 'rescheduled' }),
      buildAppointment({ id: 'a2', status: 'cancelled' }),
      buildAppointment({ id: 'a3', status: 'no_show' }),
      buildAppointment({
        id: 'a4',
        status: 'completed',
        consultationSessionId: '66666666-6666-4666-8666-666666666666',
      }),
    ];

    renderWithProviders(<AppointmentList appointments={appointments} emptyTitle="" emptyDescription="" />);

    expect(screen.queryByRole('button', { name: 'Reschedule' })).not.toBeInTheDocument();
  });

  // Demo Readiness P0: the previously-missing patient-facing cancel action --
  // eligible for the exact same statuses reschedule is (matches the real
  // backend's own cancel guard), so both actions always appear together.
  it('renders a reachable "Cancel" action for a Requested appointment', () => {
    const appointment = buildAppointment({ status: 'requested' });

    renderWithProviders(<AppointmentList appointments={[appointment]} emptyTitle="" emptyDescription="" />);

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('renders a reachable "Cancel" action for a Confirmed appointment', () => {
    const appointment = buildAppointment({ status: 'confirmed' });

    renderWithProviders(<AppointmentList appointments={[appointment]} emptyTitle="" emptyDescription="" />);

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('never renders "Cancel" for a Rescheduled, Cancelled, No-show, or Completed appointment', () => {
    const appointments = [
      buildAppointment({ id: 'a1', status: 'rescheduled' }),
      buildAppointment({ id: 'a2', status: 'cancelled' }),
      buildAppointment({ id: 'a3', status: 'no_show' }),
      buildAppointment({
        id: 'a4',
        status: 'completed',
        consultationSessionId: '66666666-6666-4666-8666-666666666666',
      }),
    ];

    renderWithProviders(<AppointmentList appointments={appointments} emptyTitle="" emptyDescription="" />);

    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });
});
