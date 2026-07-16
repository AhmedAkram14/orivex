import type { Meta, StoryObj } from '@storybook/react';
import { EmptyCalendar } from './empty-calendar';

const meta: Meta<typeof EmptyCalendar> = {
  title: 'UI/Schedule/EmptyCalendar',
  component: EmptyCalendar,
};
export default meta;

type Story = StoryObj<typeof EmptyCalendar>;

export const Default: Story = {
  args: {
    title: 'No availability configured',
    description: 'Set your working hours to start showing availability on this calendar.',
  },
};
