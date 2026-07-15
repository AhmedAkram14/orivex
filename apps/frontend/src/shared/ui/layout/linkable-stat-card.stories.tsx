import type { Meta, StoryObj } from '@storybook/react';
import { Users } from 'lucide-react';
import { LinkableStatCard } from './linkable-stat-card';

const meta: Meta<typeof LinkableStatCard> = {
  title: 'UI/Layout/LinkableStatCard',
  component: LinkableStatCard,
};
export default meta;

type Story = StoryObj<typeof LinkableStatCard>;

export const Default: Story = { args: { icon: Users, label: 'Patients in queue', value: '3' } };
export const Linked: Story = { args: { icon: Users, label: 'Patients in queue', value: '3', href: '#' } };
export const Loading: Story = { args: { icon: Users, label: 'Patients in queue', value: '3', loading: true } };
