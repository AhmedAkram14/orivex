import type { Meta, StoryObj } from '@storybook/react';
import { AvailabilityCard } from './availability-card';

const meta: Meta<typeof AvailabilityCard> = {
  title: 'UI/Schedule/AvailabilityCard',
  component: AvailabilityCard,
};
export default meta;

type Story = StoryObj<typeof AvailabilityCard>;

export const WorkingDay: Story = {
  args: {
    dayLabel: 'Monday',
    isWorkingDay: true,
    hoursLabel: '9:00 AM – 5:00 PM',
    breaksLabel: '1 break',
    notWorkingLabel: 'Not available',
  },
};

export const NonWorkingDay: Story = {
  args: {
    dayLabel: 'Saturday',
    isWorkingDay: false,
    notWorkingLabel: 'Not available',
  },
};
