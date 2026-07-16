import type { Meta, StoryObj } from '@storybook/react';
import { ConflictIndicator } from './conflict-indicator';

const meta: Meta<typeof ConflictIndicator> = {
  title: 'UI/Schedule/ConflictIndicator',
  component: ConflictIndicator,
};
export default meta;

type Story = StoryObj<typeof ConflictIndicator>;

export const OutsideWorkingHours: Story = { args: { message: 'Outside working hours' } };
export const InsufficientNotice: Story = { args: { message: 'This slot is too soon to book' } };
