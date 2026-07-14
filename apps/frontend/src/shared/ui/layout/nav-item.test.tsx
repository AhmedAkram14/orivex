import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
});

describe('NavGroup', () => {
  it('starts collapsed by default and expands on click, toggling aria-expanded', async () => {
    renderWithProviders(
      <NavGroup label="Clinical" icon={LayoutDashboard}>
        <NavItem label="Patients" icon={LayoutDashboard} href="/patients" />
      </NavGroup>,
    );

    const trigger = screen.getByRole('button', { name: 'Clinical' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'Patients' })).not.toBeInTheDocument();

    await userEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Patients' })).toBeInTheDocument();
  });

  it('starts expanded when defaultOpen is true', () => {
    renderWithProviders(
      <NavGroup label="Clinical" icon={LayoutDashboard} defaultOpen>
        <NavItem label="Patients" icon={LayoutDashboard} href="/patients" />
      </NavGroup>,
    );

    expect(screen.getByRole('button', { name: 'Clinical' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Patients' })).toBeInTheDocument();
  });
});
