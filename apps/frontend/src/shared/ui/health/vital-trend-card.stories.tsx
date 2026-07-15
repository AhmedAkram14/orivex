import type { Meta, StoryObj } from '@storybook/react';
import { Scale } from 'lucide-react';
import { VitalTrendCard } from './vital-trend-card';

const meta: Meta<typeof VitalTrendCard> = {
  title: 'UI/Health/VitalTrendCard',
  component: VitalTrendCard,
};
export default meta;

type Story = StoryObj<typeof VitalTrendCard>;

export const WithReadings: Story = {
  args: {
    icon: Scale,
    title: 'Weight',
    latestValueLabel: '74 kg',
    latestDateLabel: 'Jul 10, 2026',
    trendValues: [68, 69, 70, 71, 73, 74],
    trendLabel: 'Weight rising from 68 to 74 kg',
    emptyTitle: 'No weight readings yet',
    emptyDescription: 'Your weight readings will appear here once recorded.',
  },
};

export const Empty: Story = {
  args: {
    icon: Scale,
    title: 'Weight',
    trendValues: [],
    trendLabel: 'No readings',
    emptyTitle: 'No weight readings yet',
    emptyDescription: 'Your weight readings will appear here once recorded.',
  },
};

export const Loading: Story = {
  args: {
    icon: Scale,
    title: 'Weight',
    trendValues: [],
    trendLabel: 'No readings',
    emptyTitle: 'No weight readings yet',
    emptyDescription: 'Your weight readings will appear here once recorded.',
    loading: true,
  },
};
