import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { FilterTabs } from './filter-tabs';

const meta: Meta = { title: 'UI/FilterTabs' };
export default meta;

type FilterValue = 'all' | 'upcoming' | 'completed';

const options = [
  { value: 'all' as const, label: 'All' },
  { value: 'upcoming' as const, label: 'Upcoming' },
  { value: 'completed' as const, label: 'Completed' },
];

function ControlledFilterTabs() {
  const [value, setValue] = useState<FilterValue>('all');
  return <FilterTabs value={value} onChange={setValue} options={options} />;
}

export const Default: StoryObj = {
  render: () => <ControlledFilterTabs />,
};
