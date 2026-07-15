import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WeeklyCalendar } from './weekly-calendar';

describe('WeeklyCalendar', () => {
  it('renders a clickable day and calls onSelect', async () => {
    const onSelect = vi.fn();
    render(
      <WeeklyCalendar
        days={[{ id: '1', dayLabel: 'Mon', dateLabel: '13', onSelect }]}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Mon/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('renders a non-clickable day as static content when onSelect is omitted', () => {
    render(<WeeklyCalendar days={[{ id: '1', dayLabel: 'Mon', dateLabel: '13' }]} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('announces "today" for screen readers only when isToday and todayAnnouncement are both given', () => {
    render(
      <WeeklyCalendar
        days={[{ id: '1', dayLabel: 'Mon', dateLabel: '13', isToday: true }]}
        todayAnnouncement="Today"
      />,
    );
    expect(screen.getByText('(Today)')).toBeInTheDocument();
  });
});
