import type { Meta, StoryObj } from '@storybook/react';
import { DosageVisualization } from './dosage-visualization';

const meta: Meta<typeof DosageVisualization> = {
  title: 'UI/Medications/DosageVisualization',
  component: DosageVisualization,
};
export default meta;

type Story = StoryObj<typeof DosageVisualization>;

export const OnceDaily: Story = {
  args: { dosesPerDay: 1, label: 'Once daily' },
};

export const TwiceDaily: Story = {
  args: { dosesPerDay: 2, label: 'Twice daily' },
};

export const FourTimesDaily: Story = {
  args: { dosesPerDay: 4, label: 'Four times daily' },
};

export const Overflow: Story = {
  args: { dosesPerDay: 9, label: 'Nine times daily' },
};
