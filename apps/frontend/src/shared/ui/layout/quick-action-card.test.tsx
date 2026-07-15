import { screen } from '@testing-library/react';
import { ShieldCheck } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { QuickActionCard } from './quick-action-card';

describe('QuickActionCard', () => {
  it('renders as a real link to its destination', () => {
    renderWithProviders(<QuickActionCard label="Security Center" icon={ShieldCheck} href="/security" />);
    expect(screen.getByRole('link', { name: /Security Center/ })).toHaveAttribute('href', '/en/security');
  });

  it('renders the optional description', () => {
    renderWithProviders(
      <QuickActionCard label="Security Center" icon={ShieldCheck} href="/security" description="Manage your account" />,
    );
    expect(screen.getByText('Manage your account')).toBeInTheDocument();
  });
});
