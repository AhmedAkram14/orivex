import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { AppointmentCard } from './appointment-card';

describe('AppointmentCard', () => {
  it('renders the counterparty name, detail, status, date, and consultation type', () => {
    renderWithProviders(
      <AppointmentCard
        scheduledAtLabel="Jul 20, 2026, 10:00 AM"
        counterpartyName="Dr. Sarah Ahmed"
        counterpartyDetail="Cardiology"
        status="confirmed"
        statusLabel="Confirmed"
        consultationTypeLabel="Free consultation"
      />,
    );

    expect(screen.getByText('Jul 20, 2026, 10:00 AM')).toBeInTheDocument();
    expect(screen.getByText('Dr. Sarah Ahmed')).toBeInTheDocument();
    expect(screen.getByText('Cardiology', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Free consultation')).toBeInTheDocument();
  });

  it('renders optional actions', () => {
    renderWithProviders(
      <AppointmentCard
        scheduledAtLabel="Jul 20, 2026, 10:00 AM"
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
