import type { Meta, StoryObj } from '@storybook/react';
import { QueueStatus } from './queue-status';

const meta: Meta<typeof QueueStatus> = {
  title: 'UI/Queue/QueueStatus',
  component: QueueStatus,
};
export default meta;

type Story = StoryObj<typeof QueueStatus>;

export const Waiting: Story = { args: { status: 'waiting', label: 'Waiting' } };
export const InConsultation: Story = { args: { status: 'in-consultation', label: 'In consultation' } };
export const Completed: Story = { args: { status: 'completed', label: 'Completed' } };
