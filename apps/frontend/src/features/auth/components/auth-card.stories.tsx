import type { Meta, StoryObj } from '@storybook/react';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { AuthCard } from './auth-card';

const meta: Meta<typeof AuthCard> = {
  title: 'Auth/AuthCard',
  component: AuthCard,
};
export default meta;

type Story = StoryObj<typeof AuthCard>;

export const Default: Story = {
  args: {
    title: 'Sign in',
    description: 'Welcome back to Orivex.',
    children: (
      <div className="flex flex-col gap-4">
        <Input type="email" placeholder="you@example.com" />
        <Input type="password" placeholder="Password" />
        <Button>Sign in</Button>
      </div>
    ),
    footer: "Don't have an account? Create one",
  },
};

export const WithoutFooter: Story = {
  args: {
    title: 'Check your email',
    description: "We've sent you an email with further instructions.",
    children: <p className="text-center text-sm text-text-secondary">Click the link in the email to continue.</p>,
  },
};
