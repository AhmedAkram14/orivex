import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'outline', 'ghost', 'danger'] },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'icon'] },
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = { args: { children: 'Save changes', variant: 'primary' } };
export const Secondary: Story = { args: { children: 'Secondary', variant: 'secondary' } };
export const Outline: Story = { args: { children: 'Outline', variant: 'outline' } };
export const Ghost: Story = { args: { children: 'Ghost', variant: 'ghost' } };
export const Danger: Story = { args: { children: 'Delete', variant: 'danger' } };
export const Loading: Story = { args: { children: 'Saving…', loading: true } };
export const Disabled: Story = { args: { children: 'Disabled', disabled: true } };

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};
