import type { Meta, StoryObj } from '@storybook/react';
import { Legend } from './legend';

const meta: Meta<typeof Legend> = {
  title: 'UI/Schedule/Legend',
  component: Legend,
};
export default meta;

type Story = StoryObj<typeof Legend>;

export const SlotStatus: Story = {
  args: {
    items: [
      { id: 'available', label: 'Available', colorClassName: 'bg-success' },
      { id: 'booked', label: 'Booked', colorClassName: 'bg-primary' },
      { id: 'blocked', label: 'Blocked', colorClassName: 'bg-neutral' },
    ],
  },
};
