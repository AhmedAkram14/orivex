import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { BookingSummaryCard } from './booking-summary-card';

describe('BookingSummaryCard', () => {
  it('renders the date, time, duration, timezone, and status', () => {
    renderWithProviders(
      <BookingSummaryCard
        dateLabel="Mon, Jul 20, 2026"
        timeLabel="9:00 AM – 9:30 AM"
        durationLabel="30 minutes"
        timezoneLabel="GMT+2"
        status="confirmed"
        statusLabel="Confirmed"
      />,
    );

    expect(screen.getByText('Mon, Jul 20, 2026')).toBeInTheDocument();
    expect(screen.getByText('9:00 AM – 9:30 AM')).toBeInTheDocument();
    expect(screen.getByText('30 minutes')).toBeInTheDocument();
    expect(screen.getByText('GMT+2')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });

  it('renders optional actions', () => {
    renderWithProviders(
      <BookingSummaryCard
        dateLabel="Mon, Jul 20, 2026"
        timeLabel="9:00 AM – 9:30 AM"
        durationLabel="30 minutes"
        timezoneLabel="GMT+2"
        status="pending"
        statusLabel="Review"
        actions={<button type="button">Confirm</button>}
      />,
    );

    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
  });
});
