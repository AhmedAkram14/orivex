import type { Meta, StoryObj } from '@storybook/react';
import { LayoutDashboard } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { EmptyDashboard } from './empty-dashboard';

const meta: Meta<typeof EmptyDashboard> = {
  title: 'UI/Layout/EmptyDashboard',
  component: EmptyDashboard,
};
export default meta;

type Story = StoryObj<typeof EmptyDashboard>;

export const Default: Story = {
  args: {
    icon: LayoutDashboard,
    title: 'Nothing to show yet',
    description: 'Your dashboard will fill in as more of Orivex comes online.',
    action: <Button variant="outline">Go to Security Center</Button>,
  },
};
