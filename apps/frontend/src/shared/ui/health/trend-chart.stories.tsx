import type { Meta, StoryObj } from '@storybook/react';
import { TrendChart } from './trend-chart';

const meta: Meta<typeof TrendChart> = {
  title: 'UI/Health/TrendChart',
  component: TrendChart,
};
export default meta;

type Story = StoryObj<typeof TrendChart>;

export const Rising: Story = {
  args: { values: [68, 69, 70, 71, 73, 74], label: 'Weight rising from 68 to 74 kg' },
};

export const Falling: Story = {
  args: { values: [140, 135, 130, 128, 122, 118], label: 'Blood sugar falling from 140 to 118 mg/dL' },
};

export const Flat: Story = {
  args: { values: [120, 121, 119, 120, 120], label: 'Blood pressure steady around 120' },
};

export const InsufficientData: Story = {
  args: { values: [72], label: 'Only one reading on record' },
};
