import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@/shared/ui/button';
import { BookingSummaryCard } from './booking-summary-card';

const meta: Meta<typeof BookingSummaryCard> = {
  title: 'UI/Schedule/BookingSummaryCard',
  component: BookingSummaryCard,
};
export default meta;

type Story = StoryObj<typeof BookingSummaryCard>;

export const Pending: Story = {
  args: {
    dateLabel: 'Mon, Jul 20, 2026',
    timeLabel: '9:00 AM – 9:30 AM',
    durationLabel: '30 minutes',
    timezoneLabel: 'GMT+2',
    status: 'pending',
    statusLabel: 'Review',
    actions: (
      <>
        <Button>Confirm</Button>
        <Button variant="outline">Back</Button>
      </>
    ),
  },
};

export const Confirmed: Story = {
  args: {
    dateLabel: 'Mon, Jul 20, 2026',
    timeLabel: '9:00 AM – 9:30 AM',
    durationLabel: '30 minutes',
    timezoneLabel: 'GMT+2',
    status: 'confirmed',
    statusLabel: 'Confirmed',
    actions: (
      <>
        <Button variant="outline">Reschedule</Button>
        <Button variant="ghost">Cancel</Button>
      </>
    ),
  },
};

export const Cancelled: Story = {
  args: {
    dateLabel: 'Mon, Jul 20, 2026',
    timeLabel: '9:00 AM – 9:30 AM',
    durationLabel: '30 minutes',
    timezoneLabel: 'GMT+2',
    status: 'cancelled',
    statusLabel: 'Cancelled',
  },
};
