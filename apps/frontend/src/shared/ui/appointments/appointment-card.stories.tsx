import type { Meta, StoryObj } from '@storybook/react';
import { AppointmentCard } from './appointment-card';

const meta: Meta<typeof AppointmentCard> = {
  title: 'UI/Appointments/AppointmentCard',
  component: AppointmentCard,
};
export default meta;

type Story = StoryObj<typeof AppointmentCard>;

export const Upcoming: Story = {
  args: {
    scheduledAtLabel: 'Jul 20, 2026, 10:00 AM',
    counterpartyName: 'Dr. Sarah Ahmed',
    counterpartyDetail: 'Cardiology',
    status: 'upcoming',
    statusLabel: 'Upcoming',
    type: 'in-person',
    typeLabel: 'In-person',
    location: 'Orivex Clinic, Cairo',
  },
};

export const Video: Story = {
  args: {
    scheduledAtLabel: 'Jul 22, 2026, 2:00 PM',
    counterpartyName: 'Dr. Sarah Ahmed',
    counterpartyDetail: 'Cardiology',
    status: 'upcoming',
    statusLabel: 'Upcoming',
    type: 'video',
    typeLabel: 'Video call',
  },
};

export const Completed: Story = {
  args: {
    scheduledAtLabel: 'Jun 10, 2026, 9:00 AM',
    counterpartyName: 'Dr. Sarah Ahmed',
    counterpartyDetail: 'Cardiology',
    status: 'completed',
    statusLabel: 'Completed',
    type: 'in-person',
    typeLabel: 'In-person',
    location: 'Orivex Clinic, Cairo',
  },
};

export const Cancelled: Story = {
  args: {
    scheduledAtLabel: 'Jun 5, 2026, 11:00 AM',
    counterpartyName: 'Dr. Sarah Ahmed',
    counterpartyDetail: 'Cardiology',
    status: 'cancelled',
    statusLabel: 'Cancelled',
    type: 'in-person',
    typeLabel: 'In-person',
  },
};
