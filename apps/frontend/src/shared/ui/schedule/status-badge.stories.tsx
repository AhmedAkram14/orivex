import type { Meta, StoryObj } from '@storybook/react';
import { StatusBadge } from './status-badge';

const meta: Meta<typeof StatusBadge> = {
  title: 'UI/Schedule/StatusBadge',
  component: StatusBadge,
};
export default meta;

type Story = StoryObj<typeof StatusBadge>;

export const Available: Story = { args: { tone: 'available', label: 'Available' } };
export const Booked: Story = { args: { tone: 'booked', label: 'Booked' } };
export const Confirmed: Story = { args: { tone: 'confirmed', label: 'Confirmed' } };
export const Cancelled: Story = { args: { tone: 'cancelled', label: 'Cancelled' } };
export const Pending: Story = { args: { tone: 'pending', label: 'Pending' } };
