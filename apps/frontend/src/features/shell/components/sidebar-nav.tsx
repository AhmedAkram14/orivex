'use client';

import { useTranslations } from 'next-intl';
import { NAVIGATION_CONFIG, type NavItemConfig } from '@/features/shell/config/navigation';
import { useNavigationFeatureFlags } from '@/features/shell/hooks/use-navigation-feature-flags';
import { filterNavigationByAccess } from '@/features/shell/lib/filter-navigation';
import { useAuth } from '@/shared/auth/auth-context';
import { usePathname } from '@/shared/i18n/navigation';
import { NavGroup, NavItem } from '@/shared/ui/layout/nav-item';

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export interface SidebarNavProps {
  /** Fires when any real (non-disabled) nav link is clicked -- the mobile drawer passes its own close handler so picking a destination collapses the menu instead of leaving it open over the new page. Omitted entirely for the always-visible desktop sidebar, which has nothing to close. */
  onNavigate?: () => void;
}

/**
 * Renders `NAVIGATION_CONFIG` filtered for the current session's roles and
 * feature flags — the one place that config becomes actual sidebar/
 * mobile-nav markup. Filtering happens once, up front
 * (`filterNavigationByAccess`), so a group whose every child is flagged
 * off is dropped entirely rather than rendering as an empty, clickless
 * heading.
 */
export function SidebarNav({ onNavigate }: SidebarNavProps = {}) {
  const t = useTranslations('shell.nav');
  const { user } = useAuth();
  const pathname = usePathname();
  const isFeatureEnabled = useNavigationFeatureFlags();
  const userRoles = user?.roles ?? [];
  const items = filterNavigationByAccess(NAVIGATION_CONFIG, userRoles, isFeatureEnabled);

  return (
    <nav aria-label={t('landmarkLabel')} className="flex flex-col gap-1">
      {items.map((item) => (
        <NavEntry key={item.id} item={item} pathname={pathname} userRoles={userRoles} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

function NavEntry({
  item,
  pathname,
  userRoles,
  onNavigate,
}: {
  item: NavItemConfig;
  pathname: string;
  userRoles: readonly string[];
  onNavigate?: () => void;
}) {
  const t = useTranslations('shell.nav');
  const label = t(item.labelKey);

  if (item.children) {
    return (
      <NavGroup label={label}>
        {item.children.map((child) => (
          <NavEntry key={child.id} item={child} pathname={pathname} userRoles={userRoles} onNavigate={onNavigate} />
        ))}
      </NavGroup>
    );
  }

  const disabled = item.disabledForRoles?.some((role) => userRoles.includes(role)) ?? false;

  return (
    <NavItem
      label={label}
      icon={item.icon}
      href={item.href!}
      active={isActive(pathname, item.href!)}
      disabled={disabled}
      onClick={onNavigate}
    />
  );
}
