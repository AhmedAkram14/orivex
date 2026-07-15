import type { Meta, StoryObj } from '@storybook/react';
import { DailyTimeline } from './daily-timeline';
import { TimeSlot } from './time-slot';

const meta: Meta<typeof DailyTimeline> = {
  title: 'UI/Schedule/DailyTimeline',
  component: DailyTimeline,
};
export default meta;

type Story = StoryObj<typeof DailyTimeline>;

export const Default: Story = {
  args: {
    rows: [
      { id: '9', hourLabel: '9:00 AM', content: <TimeSlot time="9:00 AM" status="available" onSelect={() => {}} /> },
      { id: '10', hourLabel: '10:00 AM', content: <TimeSlot time="10:00 AM" status="booked" label="Reserved" /> },
      { id: '11', hourLabel: '11:00 AM', content: <TimeSlot time="11:00 AM" status="blocked" /> },
    ],
  },
};
