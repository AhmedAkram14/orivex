'use client';

import { useTranslations } from 'next-intl';
import { NAVIGATION_CONFIG, type NavItemConfig } from '@/features/shell/config/navigation';
import { filterNavigationByAccess } from '@/features/shell/lib/filter-navigation';
import { useAuth } from '@/shared/auth/auth-context';
import { FeatureGuard } from '@/shared/auth/feature-guard';
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
 * Renders `NAVIGATION_CONFIG` filtered for the current session's roles —
 * the one place that config becomes actual sidebar/mobile-nav markup.
 * Role/permission filtering happens once, up front (`filterNavigationByAccess`);
 * feature-flag-gated items are wrapped individually in `FeatureGuard` at
 * render time (see that module's own comment for why the two checks can't
 * share one code path).
 */
export function SidebarNav() {
  const t = useTranslations('shell.nav');
  const { user } = useAuth();
  const pathname = usePathname();
  const items = filterNavigationByAccess(NAVIGATION_CONFIG, user?.roles ?? []);

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

  const content = item.children ? (
    <NavGroup label={label} icon={item.icon} defaultOpen={containsActive(item, pathname)}>
      {item.children.map((child) => (
        <NavEntry key={child.id} item={child} pathname={pathname} />
      ))}
    </NavGroup>
  ) : (
    <NavItem label={label} icon={item.icon} href={item.href!} active={isActive(pathname, item.href!)} />
  );

  if (item.featureFlag) {
    return <FeatureGuard flag={item.featureFlag}>{content}</FeatureGuard>;
  }
  return content;
}
