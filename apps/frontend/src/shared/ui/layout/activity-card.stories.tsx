import type { Meta, StoryObj } from '@storybook/react';
import { KeyRound, UserPlus } from 'lucide-react';
import { ActivityCard } from './activity-card';

const meta: Meta<typeof ActivityCard> = {
  title: 'UI/Layout/ActivityCard',
  component: ActivityCard,
};
export default meta;

type Story = StoryObj<typeof ActivityCard>;

export const Default: Story = {
  args: {
    icon: UserPlus,
    title: 'New patient registered',
    description: 'Ahmed Hassan created an account.',
    timestamp: '2h ago',
  },
};

export const WithoutTimestamp: Story = {
  args: {
    icon: KeyRound,
    title: 'Password changed',
  },
};
