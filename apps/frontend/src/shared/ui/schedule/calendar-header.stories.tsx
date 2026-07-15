import type { Meta, StoryObj } from '@storybook/react';
import { CalendarHeader } from './calendar-header';
import { DateNavigation } from './date-navigation';

const meta: Meta<typeof CalendarHeader> = {
  title: 'UI/Schedule/CalendarHeader',
  component: CalendarHeader,
};
export default meta;

type Story = StoryObj<typeof CalendarHeader>;

export const Default: Story = {
  args: {
    label: 'Jul 13 – Jul 19, 2026',
    navigation: (
      <DateNavigation
        todayLabel="Today"
        previousLabel="Previous week"
        nextLabel="Next week"
        onPrevious={() => {}}
        onNext={() => {}}
        onToday={() => {}}
      />
    ),
  },
};
