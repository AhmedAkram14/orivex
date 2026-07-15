import type { Meta, StoryObj } from '@storybook/react';
import { PatientQueueCard } from './patient-queue-card';
import { WaitingQueue } from './waiting-queue';

const meta: Meta = { title: 'UI/Queue/WaitingQueue' };
export default meta;

export const WithItems: StoryObj = {
  render: () => (
    <WaitingQueue
      title="Waiting queue"
      emptyTitle="No one waiting"
      isEmpty={false}
      items={[
        <li key="1">
          <PatientQueueCard position={1} label="Patient #1" status="waiting" statusLabel="Waiting" waitTimeLabel="~5 min wait" />
        </li>,
        <li key="2">
          <PatientQueueCard position={2} label="Patient #2" status="waiting" statusLabel="Waiting" waitTimeLabel="~15 min wait" />
        </li>,
      ]}
    />
  ),
};

export const Empty: StoryObj = {
  render: () => (
    <WaitingQueue
      title="Waiting queue"
      emptyTitle="No one waiting"
      emptyDescription="Patients waiting for a consultation will appear here."
      isEmpty
      items={[]}
    />
  ),
};
