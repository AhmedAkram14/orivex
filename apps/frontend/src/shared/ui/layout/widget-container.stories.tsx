import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@/shared/ui/button';
import { WidgetContainer } from './widget-container';

const meta: Meta<typeof WidgetContainer> = {
  title: 'UI/Layout/WidgetContainer',
  component: WidgetContainer,
};
export default meta;

type Story = StoryObj<typeof WidgetContainer>;

export const Default: Story = {
  args: {
    title: 'Quick actions',
    description: 'Common shortcuts for your account.',
    children: <p className="text-sm text-text-secondary">Widget content goes here.</p>,
  },
};

export const WithActions: Story = {
  args: {
    title: 'Recent activity',
    actions: (
      <Button variant="ghost" size="sm">
        View all
      </Button>
    ),
    children: <p className="text-sm text-text-secondary">Widget content goes here.</p>,
  },
};

export const Loading: Story = {
  args: {
    title: 'Quick actions',
    loading: true,
  },
};
