import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { QueueFilters, type QueueFilterValue } from './queue-filters';

const meta: Meta = { title: 'UI/Queue/QueueFilters' };
export default meta;

const options = [
  { value: 'all' as const, label: 'All' },
  { value: 'waiting' as const, label: 'Waiting' },
  { value: 'in-consultation' as const, label: 'In consultation' },
  { value: 'completed' as const, label: 'Completed' },
];

function ControlledQueueFilters() {
  const [value, setValue] = useState<QueueFilterValue>('all');
  return <QueueFilters value={value} onChange={setValue} options={options} />;
}

export const Default: StoryObj = {
  render: () => <ControlledQueueFilters />,
};
