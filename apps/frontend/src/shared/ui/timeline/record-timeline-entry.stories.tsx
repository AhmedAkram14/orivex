import type { Meta, StoryObj } from '@storybook/react';
import { RecordTimelineEntry } from './record-timeline-entry';

const meta: Meta<typeof RecordTimelineEntry> = {
  title: 'UI/Timeline/RecordTimelineEntry',
  component: RecordTimelineEntry,
};
export default meta;

type Story = StoryObj<typeof RecordTimelineEntry>;

export const Visit: Story = {
  args: {
    dateLabel: 'Jul 12, 2026',
    type: 'visit',
    typeLabel: 'Visit',
    title: 'Annual check-up',
    description: 'Routine annual physical examination.',
    doctorName: 'Dr. Sarah Ahmed',
  },
};

export const Allergy: Story = {
  args: {
    dateLabel: 'Mar 3, 2024',
    type: 'allergy',
    typeLabel: 'Allergy',
    title: 'Penicillin',
    description: 'Reported allergic reaction: rash.',
  },
};

export const Last: Story = {
  args: {
    dateLabel: 'Jan 1, 2020',
    type: 'condition',
    typeLabel: 'Condition',
    title: 'Recorded condition',
    isLast: true,
  },
};
