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
    dosesPerDay: 2,
    frequencyLabel: 'Twice daily',
    prescribedBy: 'Dr. Sarah Ahmed',
    prescribedAtLabel: 'Jul 1, 2026',
    status: 'active',
    statusLabel: 'Active',
    refillStatus: 'not-due',
    refillStatusLabel: 'Not due',
    instructions: 'Take with food.',
  },
};

export const RefillDue: Story = {
  args: {
    medicationName: 'Lisinopril',
    dosageAmount: '10mg',
    dosesPerDay: 1,
    frequencyLabel: 'Once daily',
    prescribedBy: 'Dr. Sarah Ahmed',
    prescribedAtLabel: 'Jun 15, 2026',
    status: 'active',
    statusLabel: 'Active',
    refillStatus: 'due',
    refillStatusLabel: 'Refill due',
    showRefillBadge: true,
    refillsRemainingLabel: '1 refill remaining',
  },
};

export const Completed: Story = {
  args: {
    medicationName: 'Amoxicillin',
    dosageAmount: '250mg',
    dosesPerDay: 3,
    frequencyLabel: 'Three times daily',
    prescribedBy: 'Dr. Karim Nabil',
    prescribedAtLabel: 'Mar 3, 2026',
    status: 'completed',
    statusLabel: 'Completed',
    refillStatus: 'none-remaining',
    refillStatusLabel: 'No refills remaining',
  },
};
