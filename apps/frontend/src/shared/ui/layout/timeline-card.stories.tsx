import type { Meta, StoryObj } from '@storybook/react';
import { TimelineCard } from './timeline-card';

const meta: Meta<typeof TimelineCard> = {
  title: 'UI/Layout/TimelineCard',
  component: TimelineCard,
};
export default meta;

type Story = StoryObj<typeof TimelineCard>;

export const Default: Story = {
  args: { time: '9:30 AM', title: 'Consultation', description: 'Follow-up visit', status: 'upcoming', statusLabel: 'Upcoming' },
};

export const WithoutStatus: Story = { args: { time: '9:30 AM', title: 'Consultation' } };
