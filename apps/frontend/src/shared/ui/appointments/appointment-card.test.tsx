import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { AppointmentCard } from './appointment-card';

describe('AppointmentCard', () => {
  it('renders the counterparty name, detail, status, and date', () => {
    renderWithProviders(
      <AppointmentCard
        scheduledAtLabel="Jul 20, 2026, 10:00 AM"
        counterpartyName="Dr. Sarah Ahmed"
        counterpartyDetail="Cardiology"
        status="upcoming"
        statusLabel="Upcoming"
        type="in-person"
        typeLabel="In-person"
        location="Orivex Clinic, Cairo"
      />,
    );

    expect(screen.getByText('Jul 20, 2026, 10:00 AM')).toBeInTheDocument();
    expect(screen.getByText('Dr. Sarah Ahmed')).toBeInTheDocument();
    expect(screen.getByText('Cardiology', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    expect(screen.getByText('Orivex Clinic, Cairo', { exact: false })).toBeInTheDocument();
  });

  it('omits the location for a video appointment even when one is somehow passed', () => {
    renderWithProviders(
      <AppointmentCard
        scheduledAtLabel="Jul 22, 2026, 2:00 PM"
        counterpartyName="Dr. Sarah Ahmed"
        status="upcoming"
        statusLabel="Upcoming"
        type="video"
        typeLabel="Video call"
        location="Should not render"
      />,
    );

    expect(screen.queryByText(/Should not render/)).not.toBeInTheDocument();
  });

  it('renders optional actions', () => {
    renderWithProviders(
      <AppointmentCard
        scheduledAtLabel="Jul 20, 2026, 10:00 AM"
        counterpartyName="Dr. Sarah Ahmed"
        status="upcoming"
        statusLabel="Upcoming"
        type="in-person"
        typeLabel="In-person"
        actions={<button type="button">Reschedule</button>}
      />,
    );

    expect(screen.getByRole('button', { name: 'Reschedule' })).toBeInTheDocument();
  });
});
