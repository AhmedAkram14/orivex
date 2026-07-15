import type { Meta, StoryObj } from '@storybook/react';
import { ShieldCheck } from 'lucide-react';
import { QuickActionCard } from './quick-action-card';

const meta: Meta<typeof QuickActionCard> = {
  title: 'UI/Layout/QuickActionCard',
  component: QuickActionCard,
};
export default meta;

type Story = StoryObj<typeof QuickActionCard>;

export const Default: Story = { args: { label: 'Security Center', icon: ShieldCheck, href: '#' } };
export const WithDescription: Story = {
  args: { label: 'Security Center', icon: ShieldCheck, href: '#', description: 'Review devices and login history' },
};
