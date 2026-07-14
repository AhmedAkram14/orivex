import type { Meta, StoryObj } from '@storybook/react';
import { CalendarDays, ShieldCheck, Users } from 'lucide-react';
import { QuickActions } from './quick-actions';

const meta: Meta<typeof QuickActions> = {
  title: 'UI/Layout/QuickActions',
  component: QuickActions,
};
export default meta;

type Story = StoryObj<typeof QuickActions>;

export const Default: Story = {
  args: {
    actions: [
      { id: 'security', label: 'Security Center', icon: ShieldCheck, href: '#' },
      { id: 'patients', label: 'Patients', icon: Users, href: '#' },
      { id: 'appointments', label: 'Appointments', icon: CalendarDays, href: '#' },
    ],
  },
};

export const SingleAction: Story = {
  args: {
    actions: [{ id: 'security', label: 'Security Center', icon: ShieldCheck, href: '#' }],
  },
};
