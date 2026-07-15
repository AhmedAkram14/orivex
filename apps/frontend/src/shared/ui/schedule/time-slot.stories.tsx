import type { Meta, StoryObj } from '@storybook/react';
import { TimeSlot } from './time-slot';

const meta: Meta<typeof TimeSlot> = {
  title: 'UI/Schedule/TimeSlot',
  component: TimeSlot,
};
export default meta;

type Story = StoryObj<typeof TimeSlot>;

export const Available: Story = { args: { time: '9:00 AM', status: 'available', onSelect: () => {} } };
export const Booked: Story = { args: { time: '10:00 AM', status: 'booked', label: 'Reserved' } };
export const Blocked: Story = { args: { time: '7:00 AM', status: 'blocked' } };
