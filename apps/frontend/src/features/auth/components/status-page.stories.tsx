import type { Meta, StoryObj } from '@storybook/react';
import { Ban, Clock, Lock, LogIn, ShieldAlert } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { StatusPage } from './status-page';

const meta: Meta<typeof StatusPage> = {
  title: 'Auth/StatusPage',
  component: StatusPage,
};
export default meta;

type Story = StoryObj<typeof StatusPage>;

export const AccountLocked: Story = {
  args: {
    icon: Lock,
    title: 'Account locked',
    description: 'Your account has been locked for security reasons. Reset your password to regain access.',
    action: <Button>Reset password</Button>,
  },
};

export const SessionExpired: Story = {
  args: {
    icon: Clock,
    title: 'Session expired',
    description: 'Your session has ended. Please sign in again to continue.',
    action: <Button>Sign in again</Button>,
  },
};

export const Unauthorized: Story = {
  args: {
    icon: LogIn,
    title: 'Sign in required',
    description: 'You need to sign in to access this page.',
    action: <Button>Sign in</Button>,
  },
};

export const Forbidden: Story = {
  args: {
    icon: ShieldAlert,
    title: 'Access restricted',
    description: "Your account doesn't have permission to view this page.",
    action: <Button variant="outline">Back to home</Button>,
  },
};

export const AccessDenied: Story = {
  args: {
    icon: Ban,
    title: 'Access denied',
    description: "You don't have access to this resource.",
    action: <Button variant="outline">Back to home</Button>,
  },
};
