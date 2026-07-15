import type { Meta, StoryObj } from '@storybook/react';
import { AvailabilityBlock } from './availability-block';
import { WeeklyCalendar } from './weekly-calendar';

const meta: Meta<typeof WeeklyCalendar> = {
  title: 'UI/Schedule/WeeklyCalendar',
  component: WeeklyCalendar,
};
export default meta;

type Story = StoryObj<typeof WeeklyCalendar>;

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const Default: Story = {
  args: {
    todayAnnouncement: 'Today',
    days: dayLabels.map((dayLabel, index) => ({
      id: dayLabel,
      dayLabel,
      dateLabel: String(13 + index),
      isToday: index === 3,
      isSelected: index === 3,
      onSelect: () => {},
      content: index < 5 ? <AvailabilityBlock startLabel="9:00 AM" endLabel="5:00 PM" /> : undefined,
    })),
  },
};
