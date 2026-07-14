import { render, screen } from '@testing-library/react';
import { Lock } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { StatusPage } from '@/features/auth/components/status-page';

describe('StatusPage', () => {
  it('renders the icon, title, description, and action', () => {
    render(
      <StatusPage
        icon={Lock}
        title="Account locked"
        description="Reset your password to regain access."
        action={<button type="button">Reset password</button>}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Account locked' })).toBeInTheDocument();
    expect(screen.getByText('Reset your password to regain access.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset password' })).toBeInTheDocument();
  });

  it('renders without an action when none is provided', () => {
    render(<StatusPage icon={Lock} title="Account locked" description="Reset your password to regain access." />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
