import type { Meta, StoryObj } from '@storybook/react';
import { PatientQueueCard } from './patient-queue-card';

const meta: Meta<typeof PatientQueueCard> = {
  title: 'UI/Queue/PatientQueueCard',
  component: PatientQueueCard,
};
export default meta;

type Story = StoryObj<typeof PatientQueueCard>;

export const Waiting: Story = {
  args: { position: 2, label: 'Patient #2', status: 'waiting', statusLabel: 'Waiting', waitTimeLabel: '~15 min wait' },
};

export const InConsultation: Story = {
  args: { position: 1, label: 'Patient #1', status: 'in-consultation', statusLabel: 'In consultation' },
};
