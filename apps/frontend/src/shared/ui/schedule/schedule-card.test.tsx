import { screen } from '@testing-library/react';
import { CalendarClock } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { ScheduleCard } from './schedule-card';

describe('ScheduleCard', () => {
  it('renders as a link to href when provided', () => {
    renderWithProviders(
      <ScheduleCard icon={CalendarClock} title="Next available slot" dateLabel="Today" timeLabel="2:00 PM" href="/doctor/schedule" />,
    );
    const link = screen.getByRole('link', { name: /Next available slot/ });
    expect(link).toHaveAttribute('href', '/en/doctor/schedule');
  });

  it('renders as static content when href is omitted', () => {
    renderWithProviders(<ScheduleCard icon={CalendarClock} title="Next available slot" dateLabel="Today" timeLabel="2:00 PM" />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Next available slot')).toBeInTheDocument();
  });
});
