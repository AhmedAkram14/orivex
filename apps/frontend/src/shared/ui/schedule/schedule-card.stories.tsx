import type { Meta, StoryObj } from '@storybook/react';
import { CalendarClock } from 'lucide-react';
import { ScheduleCard } from './schedule-card';

const meta: Meta<typeof ScheduleCard> = {
  title: 'UI/Schedule/ScheduleCard',
  component: ScheduleCard,
};
export default meta;

type Story = StoryObj<typeof ScheduleCard>;

export const Default: Story = {
  args: {
    icon: CalendarClock,
    title: 'Next available slot',
    dateLabel: 'Today',
    timeLabel: '2:00 PM – 3:00 PM',
    href: '#',
  },
};

export const Static: Story = {
  args: {
    icon: CalendarClock,
    title: 'Next available slot',
    dateLabel: 'Today',
    timeLabel: '2:00 PM – 3:00 PM',
  },
};
