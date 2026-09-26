import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { AppointmentCard } from './appointment-card';

describe('AppointmentCard', () => {
  it('renders the counterparty name, specialty chip, status, time, and consultation type', () => {
    renderWithProviders(
      <AppointmentCard
        scheduledAt="2026-07-20T10:00:00.000Z"
        timeLabel="10:00 AM"
        counterpartyName="Dr. Sarah Ahmed"
        counterpartyDetail="Cardiology"
        status="confirmed"
        statusLabel="Confirmed"
        consultationTypeLabel="Free consultation"
      />,
    );

    expect(screen.getByText('10:00 AM')).toBeInTheDocument();
    expect(screen.getByText('Dr. Sarah Ahmed')).toBeInTheDocument();
    expect(screen.getByText('Cardiology', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Free consultation')).toBeInTheDocument();
  });

  it('renders optional actions', () => {
    renderWithProviders(
      <AppointmentCard
        scheduledAt="2026-07-20T10:00:00.000Z"
        timeLabel="10:00 AM"
        counterpartyName="Dr. Sarah Ahmed"
        status="confirmed"
        statusLabel="Confirmed"
        consultationTypeLabel="Free consultation"
        actions={<button type="button">Reschedule</button>}
      />,
    );

    expect(screen.getByRole('button', { name: 'Reschedule' })).toBeInTheDocument();
  });
});
