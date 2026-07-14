import { describe, expect, it } from 'vitest';
import { filterNavigationByAccess } from '@/features/shell/lib/filter-navigation';
import type { NavItemConfig } from '@/features/shell/config/navigation';
import { LayoutDashboard } from 'lucide-react';

const items: NavItemConfig[] = [
  { id: 'dashboard', labelKey: 'dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { id: 'admin-only', labelKey: 'adminOnly', icon: LayoutDashboard, href: '/admin', roles: ['super_admin'] },
  {
    id: 'billing',
    labelKey: 'billing',
    icon: LayoutDashboard,
    href: '/billing',
    permission: 'billing:read',
  },
  {
    id: 'group',
    labelKey: 'group',
    icon: LayoutDashboard,
    children: [
      { id: 'group-child-open', labelKey: 'groupChildOpen', icon: LayoutDashboard, href: '/open' },
      {
        id: 'group-child-restricted',
        labelKey: 'groupChildRestricted',
        icon: LayoutDashboard,
        href: '/restricted',
        roles: ['super_admin'],
      },
    ],
  },
  {
    id: 'flagged-group',
    labelKey: 'flaggedGroup',
    icon: LayoutDashboard,
    children: [
      {
        id: 'flagged-child',
        labelKey: 'flaggedChild',
        icon: LayoutDashboard,
        href: '/flagged',
        featureFlag: 'nav.example',
      },
    ],
  },
];

const noFlagsEnabled = () => false;
const allFlagsEnabled = () => true;

describe('filterNavigationByAccess', () => {
  it('keeps unrestricted items for any role', () => {
    const result = filterNavigationByAccess(items, ['patient'], noFlagsEnabled);
    expect(result.map((item) => item.id)).toContain('dashboard');
  });

  it('drops a role-restricted item when the current roles do not include any allowed role', () => {
    const result = filterNavigationByAccess(items, ['patient'], noFlagsEnabled);
    expect(result.find((item) => item.id === 'admin-only')).toBeUndefined();
  });

  it('keeps a role-restricted item when one of the current roles is allowed', () => {
    const result = filterNavigationByAccess(items, ['super_admin'], noFlagsEnabled);
    expect(result.find((item) => item.id === 'admin-only')).toBeDefined();
  });

  it('drops a permission-gated item when no role grants that permission', () => {
    const result = filterNavigationByAccess(items, ['patient'], noFlagsEnabled);
    expect(result.find((item) => item.id === 'billing')).toBeUndefined();
  });

  it('keeps a permission-gated item when a role grants that permission', () => {
    const result = filterNavigationByAccess(items, ['hospital_admin'], noFlagsEnabled);
    expect(result.find((item) => item.id === 'billing')).toBeDefined();
  });

  it('filters children of a group and drops the group entirely once every child is filtered out', () => {
    const result = filterNavigationByAccess(items, ['patient'], noFlagsEnabled);
    const group = result.find((item) => item.id === 'group');
    expect(group?.children?.map((child) => child.id)).toEqual(['group-child-open']);
  });

  it('keeps a group with all children when every child is allowed', () => {
    const result = filterNavigationByAccess(items, ['super_admin'], noFlagsEnabled);
    const group = result.find((item) => item.id === 'group');
    expect(group?.children).toHaveLength(2);
  });

  it('returns an empty array for a caller with no roles at all', () => {
    const result = filterNavigationByAccess(items, [], noFlagsEnabled);
    expect(result.find((item) => item.id === 'admin-only')).toBeUndefined();
    expect(result.find((item) => item.id === 'billing')).toBeUndefined();
    expect(result.find((item) => item.id === 'dashboard')).toBeDefined();
  });

  it('drops a group entirely when every child is behind a disabled feature flag, never an empty clickless heading', () => {
    const result = filterNavigationByAccess(items, ['super_admin'], noFlagsEnabled);
    expect(result.find((item) => item.id === 'flagged-group')).toBeUndefined();
  });

  it('keeps a flagged group and child once the flag resolver reports it enabled', () => {
    const result = filterNavigationByAccess(items, ['super_admin'], allFlagsEnabled);
    const group = result.find((item) => item.id === 'flagged-group');
    expect(group?.children?.map((child) => child.id)).toEqual(['flagged-child']);
  });
});
