import type { Meta, StoryObj } from '@storybook/react';
import { TimeGrid } from './time-grid';

const meta: Meta<typeof TimeGrid> = {
  title: 'UI/Schedule/TimeGrid',
  component: TimeGrid,
};
export default meta;

type Story = StoryObj<typeof TimeGrid>;

export const Default: Story = {
  args: {
    slots: [
      { id: '1', timeLabel: '9:00 AM', status: 'available', onSelect: () => {} },
      { id: '2', timeLabel: '9:30 AM', status: 'booked', detail: 'Booked — reserved' },
      { id: '3', timeLabel: '10:00 AM', status: 'available', onSelect: () => {} },
      { id: '4', timeLabel: '10:30 AM', status: 'blocked', detail: 'Outside working hours' },
      { id: '5', timeLabel: '11:00 AM', status: 'available', onSelect: () => {} },
      { id: '6', timeLabel: '11:30 AM', status: 'available', onSelect: () => {} },
    ],
  },
};
