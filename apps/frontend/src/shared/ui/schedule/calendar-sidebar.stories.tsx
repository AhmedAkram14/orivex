import type { Meta, StoryObj } from '@storybook/react';
import { CalendarSidebar } from './calendar-sidebar';

const meta: Meta<typeof CalendarSidebar> = {
  title: 'UI/Schedule/CalendarSidebar',
  component: CalendarSidebar,
};
export default meta;

type Story = StoryObj<typeof CalendarSidebar>;

export const LegendOnly: Story = {
  args: {
    legendItems: [
      { id: 'available', label: 'Available', colorClassName: 'bg-success' },
      { id: 'booked', label: 'Booked', colorClassName: 'bg-primary' },
    ],
  },
};

export const WithExtraContent: Story = {
  args: {
    legendItems: [{ id: 'available', label: 'Available', colorClassName: 'bg-success' }],
    children: <p className="text-sm text-text-secondary">Additional filters go here.</p>,
  },
};
