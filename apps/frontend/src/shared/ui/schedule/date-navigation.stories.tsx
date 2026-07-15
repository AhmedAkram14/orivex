import type { Meta, StoryObj } from '@storybook/react';
import { DateNavigation } from './date-navigation';

const meta: Meta<typeof DateNavigation> = {
  title: 'UI/Schedule/DateNavigation',
  component: DateNavigation,
};
export default meta;

type Story = StoryObj<typeof DateNavigation>;

export const Default: Story = {
  args: {
    todayLabel: 'Today',
    previousLabel: 'Previous week',
    nextLabel: 'Next week',
    onPrevious: () => {},
    onNext: () => {},
    onToday: () => {},
  },
};
