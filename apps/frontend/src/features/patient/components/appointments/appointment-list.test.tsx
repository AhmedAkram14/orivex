import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import type { Appointment } from '@/features/patient/api/types';

import { AppointmentList } from './appointment-list';

function buildAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    scheduledAt: '2026-08-01T10:00:00.000Z',
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
});
