import type { Meta, StoryObj } from '@storybook/react';
import { StatusBadge } from './status-badge';

const meta: Meta<typeof StatusBadge> = {
  title: 'UI/StatusBadge',
  component: StatusBadge,
};
export default meta;

type Story = StoryObj<typeof StatusBadge>;

export const Pending: Story = { args: { status: 'requested' } };
export const Confirmed: Story = { args: { status: 'confirmed' } };
export const Live: Story = { args: { status: 'in_consultation' } };
export const Completed: Story = { args: { status: 'completed' } };
export const Cancelled: Story = { args: { status: 'cancelled' } };
export const AwaitingOutcome: Story = { args: { status: 'confirmed', timeAware: { scheduledAt: '2020-01-01T10:00:00.000Z' } } };
