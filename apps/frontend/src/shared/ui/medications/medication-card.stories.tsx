import type { Meta, StoryObj } from '@storybook/react';
import { MedicationCard } from './medication-card';

const meta: Meta<typeof MedicationCard> = {
  title: 'UI/Medications/MedicationCard',
  component: MedicationCard,
};
export default meta;

type Story = StoryObj<typeof MedicationCard>;

export const Active: Story = {
  args: {
    medicationName: 'Metformin',
    dosageAmount: '500mg',
    frequencyLabel: 'Twice daily',
    prescribedBy: 'Dr. Sarah Ahmed',
    prescribedAtLabel: 'Jul 1, 2026',
    status: 'active',
    statusLabel: 'Active',
    instructions: 'Take with food.',
  },
};

export const Expired: Story = {
  args: {
    medicationName: 'Lisinopril',
    dosageAmount: '10mg',
    frequencyLabel: 'Once daily',
    prescribedBy: 'Dr. Sarah Ahmed',
    prescribedAtLabel: 'Jun 15, 2026',
    status: 'expired',
    statusLabel: 'Expired',
  },
};

export const Completed: Story = {
  args: {
    medicationName: 'Amoxicillin',
    dosageAmount: '250mg',
    frequencyLabel: 'Three times daily',
    prescribedBy: 'Dr. Karim Nabil',
    prescribedAtLabel: 'Mar 3, 2026',
    status: 'completed',
    statusLabel: 'Completed',
  },
};
