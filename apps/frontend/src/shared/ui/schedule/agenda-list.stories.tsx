import type { Meta, StoryObj } from '@storybook/react';
import { AgendaList } from './agenda-list';

const meta: Meta<typeof AgendaList> = {
  title: 'UI/Schedule/AgendaList',
  component: AgendaList,
};
export default meta;

type Story = StoryObj<typeof AgendaList>;

export const WithItems: Story = {
  args: {
    items: [
      { id: '1', dateLabel: 'Mon, Jul 20', timeLabel: '9:00 AM', title: 'Available', status: 'available', statusLabel: 'Available' },
      { id: '2', dateLabel: 'Mon, Jul 20', timeLabel: '9:30 AM', title: 'Booked', status: 'booked', statusLabel: 'Booked' },
      { id: '3', dateLabel: 'Tue, Jul 21', timeLabel: '10:00 AM', title: 'Available', status: 'available', statusLabel: 'Available' },
    ],
    emptyTitle: 'Nothing scheduled',
  },
};

export const Empty: Story = {
  args: {
    items: [],
    emptyTitle: 'Nothing scheduled',
    emptyDescription: 'Your upcoming slots will appear here.',
  },
};
