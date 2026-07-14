import { screen } from '@testing-library/react';
import { ShieldCheck } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { QuickActions } from './quick-actions';

describe('QuickActions', () => {
  it('renders each action as a real link to its destination', () => {
    renderWithProviders(
      <QuickActions
        actions={[{ id: 'security', label: 'Security Center', icon: ShieldCheck, href: '/security' }]}
      />,
    );

    const link = screen.getByRole('link', { name: 'Security Center' });
    expect(link).toHaveAttribute('href', '/en/security');
  });
});
