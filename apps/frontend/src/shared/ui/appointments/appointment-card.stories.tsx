import type { Meta, StoryObj } from '@storybook/react';
import { AppointmentCard } from './appointment-card';

const meta: Meta<typeof AppointmentCard> = {
  title: 'UI/Appointments/AppointmentCard',
  component: AppointmentCard,
};
export default meta;

type Story = StoryObj<typeof AppointmentCard>;

export const Confirmed: Story = {
  args: {
    scheduledAtLabel: 'Jul 20, 2026, 10:00 AM',
    counterpartyName: 'Dr. Sarah Ahmed',
    counterpartyDetail: 'Cardiology',
    status: 'confirmed',
    statusLabel: 'Confirmed',
    consultationTypeLabel: 'Free consultation',
  },
};

export const Requested: Story = {
  args: {
    scheduledAtLabel: 'Jul 22, 2026, 2:00 PM',
    counterpartyName: 'Dr. Sarah Ahmed',
    counterpartyDetail: 'Cardiology',
    status: 'requested',
    statusLabel: 'Requested',
    consultationTypeLabel: 'Paid consultation',
  },
};

export const Completed: Story = {
  args: {
    scheduledAtLabel: 'Jun 10, 2026, 9:00 AM',
    counterpartyName: 'Dr. Sarah Ahmed',
    counterpartyDetail: 'Cardiology',
    status: 'completed',
    statusLabel: 'Completed',
    consultationTypeLabel: 'Free consultation',
  },
};

export const Cancelled: Story = {
  args: {
    scheduledAtLabel: 'Jun 5, 2026, 11:00 AM',
    counterpartyName: 'Dr. Sarah Ahmed',
    counterpartyDetail: 'Cardiology',
    status: 'cancelled',
    statusLabel: 'Cancelled',
    consultationTypeLabel: 'Free consultation',
  },
};
