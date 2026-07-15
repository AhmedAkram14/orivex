import type { Meta, StoryObj } from '@storybook/react';
import { AvailabilityBlock } from './availability-block';

const meta: Meta<typeof AvailabilityBlock> = {
  title: 'UI/Schedule/AvailabilityBlock',
  component: AvailabilityBlock,
};
export default meta;

type Story = StoryObj<typeof AvailabilityBlock>;

export const Default: Story = { args: { startLabel: '9:00 AM', endLabel: '5:00 PM' } };
export const WithLabel: Story = { args: { startLabel: '9:00 AM', endLabel: '12:00 PM', label: 'Morning clinic' } };
