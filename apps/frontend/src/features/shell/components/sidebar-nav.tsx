'use client';

import { useTranslations } from 'next-intl';
import { NAVIGATION_CONFIG, type NavItemConfig } from '@/features/shell/config/navigation';
import { useNavigationFeatureFlags } from '@/features/shell/hooks/use-navigation-feature-flags';
import { filterNavigationByAccess } from '@/features/shell/lib/filter-navigation';
import { flattenNavHrefs, getActiveNavHref } from '@/features/shell/lib/nav-active-match';
import { useUnreadMessageCount } from '@/features/messaging/hooks/use-unread-message-count';
import { useAuth } from '@/shared/auth/auth-context';
import { usePathname } from '@/shared/i18n/navigation';
import { Badge } from '@/shared/ui/badge';
import { NavGroup, NavItem } from '@/shared/ui/layout/nav-item';

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
  // Longest-match-wins across the WHOLE tree, not per-item in isolation --
  // see nav-active-match.ts's own comment for why a per-item prefix check
  // makes a workspace's own root ("Overview") falsely active on every one
  // of its sibling pages too.
  const activeHref = getActiveNavHref(pathname, flattenNavHrefs(items));

  return (
    <nav aria-label={t('landmarkLabel')} className="flex flex-col gap-1">
      {items.map((item) => (
        <NavEntry key={item.id} item={item} activeHref={activeHref} userRoles={userRoles} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

function NavEntry({
  item,
  activeHref,
  userRoles,
  onNavigate,
}: {
  item: NavItemConfig;
  activeHref: string | null;
  userRoles: readonly string[];
  onNavigate?: () => void;
}) {
  const t = useTranslations('shell.nav');
  const label = t(item.labelKey);

  if (item.children) {
    return (
      <NavGroup label={label}>
        {item.children.map((child) => (
          <NavEntry key={child.id} item={child} activeHref={activeHref} userRoles={userRoles} onNavigate={onNavigate} />
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
      active={item.href === activeHref}
      disabled={disabled}
      onClick={onNavigate}
      badge={item.badge === 'unread-messages' ? <UnreadMessagesNavBadge /> : undefined}
    />
  );
}

/**
 * Messages Page Overhaul (Phase 3): the live unread-message count next to
 * the doctor/patient "Messages" nav entries (both roles share this same
 * render path via `NavItem`'s own `badge` slot -- `MobileNav` renders
 * `SidebarNav` directly, so it gets this for free, no separate wiring).
 * Renders nothing at zero, matching `NotificationBell`'s own "no badge at
 * zero" convention.
 */
function UnreadMessagesNavBadge() {
  const count = useUnreadMessageCount();
  if (count === 0) return null;
  return (
    <Badge variant="danger" className="min-w-4 justify-center px-1 py-0 text-[10px]">
      {count > 9 ? '9+' : count}
    </Badge>
  );
}
