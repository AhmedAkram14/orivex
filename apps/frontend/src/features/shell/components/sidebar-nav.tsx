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

function containsActive(item: NavItemConfig, pathname: string): boolean {
  if (item.href) return isActive(pathname, item.href);
  return (item.children ?? []).some((child) => containsActive(child, pathname));
}

/**
 * Renders `NAVIGATION_CONFIG` filtered for the current session's roles and
 * feature flags — the one place that config becomes actual sidebar/
 * mobile-nav markup. Filtering happens once, up front
 * (`filterNavigationByAccess`), so a group whose every child is flagged
 * off is dropped entirely rather than rendering as an empty, clickless
 * heading.
 */
export function SidebarNav() {
  const t = useTranslations('shell.nav');
  const { user } = useAuth();
  const pathname = usePathname();
  const isFeatureEnabled = useNavigationFeatureFlags();
  const items = filterNavigationByAccess(NAVIGATION_CONFIG, user?.roles ?? [], isFeatureEnabled);

  return (
    <nav aria-label={t('landmarkLabel')} className="flex flex-col gap-1">
      {items.map((item) => (
        <NavEntry key={item.id} item={item} pathname={pathname} />
      ))}
    </nav>
  );
}

function NavEntry({ item, pathname }: { item: NavItemConfig; pathname: string }) {
  const t = useTranslations('shell.nav');
  const label = t(item.labelKey);

  if (item.children) {
    return (
      <NavGroup label={label} icon={item.icon} defaultOpen={containsActive(item, pathname)}>
        {item.children.map((child) => (
          <NavEntry key={child.id} item={child} pathname={pathname} />
        ))}
      </NavGroup>
    );
  }

  return <NavItem label={label} icon={item.icon} href={item.href!} active={isActive(pathname, item.href!)} />;
}
