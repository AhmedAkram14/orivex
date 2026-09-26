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
    scheduledAt: '2026-07-20T10:00:00.000Z',
    timeLabel: '10:00 AM',
    counterpartyName: 'Dr. Sarah Ahmed',
    counterpartyDetail: 'Cardiology',
    status: 'confirmed',
    statusLabel: 'Confirmed',
    consultationTypeLabel: 'Free consultation',
  },
};

export const Requested: Story = {
  args: {
    scheduledAt: '2026-07-22T14:00:00.000Z',
    timeLabel: '2:00 PM',
    counterpartyName: 'Dr. Sarah Ahmed',
    counterpartyDetail: 'Cardiology',
    status: 'requested',
    statusLabel: 'Requested',
    consultationTypeLabel: 'Paid consultation',
  },
};

export const Completed: Story = {
  args: {
    scheduledAt: '2026-07-24T10:00:00.000Z',
    timeLabel: '10:00 AM',
    counterpartyName: 'Dr. Sarah Ahmed',
    counterpartyDetail: 'Cardiology',
    status: 'completed',
    statusLabel: 'Completed',
    consultationTypeLabel: 'Free consultation',
  },
};

export const Cancelled: Story = {
  args: {
    scheduledAt: '2026-07-24T10:00:00.000Z',
    timeLabel: '10:00 AM',
    counterpartyName: 'Dr. Sarah Ahmed',
    counterpartyDetail: 'Cardiology',
    status: 'cancelled',
    statusLabel: 'Cancelled',
    consultationTypeLabel: 'Free consultation',
  },
};
