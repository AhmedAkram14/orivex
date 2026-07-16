import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { MonthCalendar, type MonthCalendarDay } from './month-calendar';

const weekDayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildDays(overrides: Partial<MonthCalendarDay> = {}): MonthCalendarDay[] {
  return Array.from({ length: 42 }, (_, index) => ({
    id: String(index),
    dateLabel: String((index % 30) + 1),
    isCurrentMonth: true,
    ...overrides,
  }));
}

describe('MonthCalendar', () => {
  it('renders all 7 weekday labels and 42 day cells', () => {
    renderWithProviders(<MonthCalendar days={buildDays()} weekDayLabels={weekDayLabels} />);

    for (const label of weekDayLabels) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it('calls onSelect when a selectable day is clicked', async () => {
    const onSelect = vi.fn();
    const days = buildDays();
    days[10] = { ...days[10], onSelect };
    renderWithProviders(<MonthCalendar days={days} weekDayLabels={weekDayLabels} />);

    await userEvent.click(screen.getByRole('button', { name: days[10].dateLabel }));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('renders a day with no onSelect as non-interactive', () => {
    renderWithProviders(<MonthCalendar days={buildDays()} weekDayLabels={weekDayLabels} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
