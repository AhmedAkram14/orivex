import { hasPermission } from '@/shared/auth/permissions';
import type { Role } from '@/shared/auth/types';
import type { NavItemConfig } from '@/features/shell/config/navigation';

/**
 * Filters the nav config by role and permission only — a plain function,
 * deliberately not a hook, so it stays unit-testable without a React tree
 * and safe to call unconditionally on every render. Feature-flag
 * visibility is handled separately, at render time, by wrapping each
 * flagged item in `FeatureGuard` (`shared/auth/feature-guard.tsx`) — that
 * check genuinely is a hook (`useFeatureFlag`), so it can't live inside a
 * loop here without breaking the rules of hooks.
 *
 * A group node (one with `children`) is dropped entirely once every one of
 * its children has been filtered out, so the sidebar never shows an empty,
 * clickless group heading.
 */
export function filterNavigationByAccess(items: NavItemConfig[], roles: Role[]): NavItemConfig[] {
  const result: NavItemConfig[] = [];

  for (const item of items) {
    if (item.roles && !item.roles.some((role) => roles.includes(role))) continue;
    if (item.permission && !hasPermission(roles, item.permission)) continue;

    if (item.children) {
      const children = filterNavigationByAccess(item.children, roles);
      if (children.length === 0) continue;
      result.push({ ...item, children });
      continue;
    }

    result.push(item);
  }

  return result;
}
