import type { Meta, StoryObj } from '@storybook/react';
import { CurrentPatientCard } from './current-patient-card';
import { PatientQueueCard } from './patient-queue-card';

const meta: Meta = { title: 'UI/Queue/CurrentPatientCard' };
export default meta;

export const WithPatient: StoryObj = {
  render: () => (
    <CurrentPatientCard
      title="Current patient"
      emptyTitle="No one in consultation"
      content={<PatientQueueCard position={1} label="Patient #1" status="in-consultation" statusLabel="In consultation" />}
    />
  ),
};

export const Empty: StoryObj = {
  render: () => (
    <CurrentPatientCard
      title="Current patient"
      emptyTitle="No one in consultation"
      emptyDescription="The current patient will appear here once a consultation is in progress."
    />
  ),
};
