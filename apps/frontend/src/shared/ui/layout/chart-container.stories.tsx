import type { Meta, StoryObj } from '@storybook/react';
import { ChartContainer } from './chart-container';

const meta: Meta<typeof ChartContainer> = {
  title: 'UI/Layout/ChartContainer',
  component: ChartContainer,
};
export default meta;

type Story = StoryObj<typeof ChartContainer>;

/**
 * Demonstrates the container's shape with placeholder sample content —
 * not a claim that a chart library is wired up. No real page renders this
 * with fabricated data; a business module with real series data mounts an
 * actual chart into this slot once one exists.
 */
export const Default: Story = {
  args: {
    title: 'Appointments over time',
    description: 'Sample layout only — no chart library is integrated yet.',
    children: <p className="text-sm text-text-tertiary">Chart renders here once a library is chosen.</p>,
  },
};
