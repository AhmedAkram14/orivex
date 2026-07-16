import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { AvailabilityCard } from './availability-card';

describe('AvailabilityCard', () => {
  it('renders hours and breaks for a working day', () => {
    renderWithProviders(
      <AvailabilityCard
        dayLabel="Monday"
        isWorkingDay
        hoursLabel="9:00 AM – 5:00 PM"
        breaksLabel="1 break"
        notWorkingLabel="Not available"
      />,
    );

    expect(screen.getByText('Monday')).toBeInTheDocument();
    expect(screen.getByText('9:00 AM – 5:00 PM')).toBeInTheDocument();
    expect(screen.getByText('1 break')).toBeInTheDocument();
  });

  it('renders the not-working label for a non-working day', () => {
    renderWithProviders(<AvailabilityCard dayLabel="Saturday" isWorkingDay={false} notWorkingLabel="Not available" />);

    expect(screen.getByText('Not available')).toBeInTheDocument();
  });
});
