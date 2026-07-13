import type { Meta, StoryObj } from '@storybook/react';
import { Inbox } from 'lucide-react';
import { Button } from './button';
import { EmptyState } from './empty-state';

const meta: Meta<typeof EmptyState> = { title: 'UI/EmptyState', component: EmptyState };
export default meta;

export const Default: StoryObj = {
  render: () => (
    <EmptyState
      icon={Inbox}
      title="No appointments yet"
      description="Appointments booked by patients will appear here."
      action={<Button size="sm">Book an appointment</Button>}
    />
  ),
};
