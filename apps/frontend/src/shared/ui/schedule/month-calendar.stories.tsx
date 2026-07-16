import type { Meta, StoryObj } from '@storybook/react';
import { MonthCalendar, type MonthCalendarDay } from './month-calendar';
import { Badge } from '@/shared/ui/badge';

const meta: Meta<typeof MonthCalendar> = {
  title: 'UI/Schedule/MonthCalendar',
  component: MonthCalendar,
};
export default meta;

type Story = StoryObj<typeof MonthCalendar>;

const weekDayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildDays(): MonthCalendarDay[] {
  return Array.from({ length: 42 }, (_, index) => {
    const dayOfMonth = index - 2; // June 2026 grid starts a couple of days into the prior month
    const isCurrentMonth = dayOfMonth >= 1 && dayOfMonth <= 31;
    return {
      id: String(index),
      dateLabel: String(((dayOfMonth - 1 + 31) % 31) + 1),
      isCurrentMonth,
      isToday: index === 17,
      isSelected: index === 17,
      onSelect: () => {},
      content: isCurrentMonth && index % 5 === 0 ? <Badge variant="info">2</Badge> : undefined,
    };
  });
}

export const Default: Story = {
  args: { days: buildDays(), weekDayLabels },
};
