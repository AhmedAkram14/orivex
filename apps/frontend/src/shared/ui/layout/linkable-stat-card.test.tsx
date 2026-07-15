import { screen } from '@testing-library/react';
import { Users } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { LinkableStatCard } from './linkable-stat-card';

describe('LinkableStatCard', () => {
  it('shows a loading skeleton instead of the value when loading', () => {
    renderWithProviders(<LinkableStatCard icon={Users} label="Patients in queue" value="3" loading />);
    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });

  it('renders as a link when href is provided', () => {
    renderWithProviders(<LinkableStatCard icon={Users} label="Patients in queue" value="3" href="/doctor/queue" />);
    expect(screen.getByRole('link', { name: /3/ })).toHaveAttribute('href', '/en/doctor/queue');
  });

  it('renders as a static tile when href is omitted', () => {
    renderWithProviders(<LinkableStatCard icon={Users} label="Patients in queue" value="3" />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
