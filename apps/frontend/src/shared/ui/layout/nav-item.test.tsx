import { screen } from '@testing-library/react';
import { LayoutDashboard } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { NavGroup, NavItem } from './nav-item';

describe('NavItem', () => {
  it('marks the active item with aria-current="page"', () => {
    renderWithProviders(<NavItem label="Dashboard" icon={LayoutDashboard} href="/dashboard" active />);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
  });

  it('does not set aria-current on an inactive item', () => {
    renderWithProviders(<NavItem label="Dashboard" icon={LayoutDashboard} href="/dashboard" />);
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
  });

  it('renders as an inert, non-navigating element when disabled', () => {
    renderWithProviders(<NavItem label="Dashboard" icon={LayoutDashboard} href="/dashboard" disabled />);
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    const item = screen.getByText('Dashboard');
    expect(item.closest('[aria-disabled="true"]')).toBeInTheDocument();
  });
});

describe('NavGroup', () => {
  it('renders a plain, always-visible heading with its children -- no collapse/expand', () => {
    renderWithProviders(
      <NavGroup label="Clinical">
        <NavItem label="Patients" icon={LayoutDashboard} href="/patients" />
      </NavGroup>,
    );

    expect(screen.getByText('Clinical')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clinical' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Patients' })).toBeInTheDocument();
  });
});
