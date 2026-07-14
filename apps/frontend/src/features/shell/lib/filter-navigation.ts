import { hasPermission } from '@/shared/auth/permissions';
import type { Role } from '@/shared/auth/types';
import type { NavItemConfig } from '@/features/shell/config/navigation';

/**
 * Filters the nav config by role, permission, and feature flag — a plain
 * function, deliberately not a hook itself, so it stays unit-testable
 * without a React tree. `isFeatureEnabled` is a plain resolver the caller
 * builds from a *fixed* set of `useFeatureFlag` calls (one per known flag
 * in `NAVIGATION_CONFIG`, called unconditionally at the top of
 * `SidebarNav` — see that file), rather than this function calling the
 * hook itself inside a loop, which would break the rules of hooks.
 *
 * Flag filtering has to happen in this same recursive pass, not deferred
 * to a per-item `FeatureGuard` at render time: a group whose *children*
 * are all flagged off would otherwise still render as an empty, clickless
 * heading, since nothing upstream of the leaf `FeatureGuard`s would know
 * to drop the now-childless group.
 */
export function filterNavigationByAccess(
  items: NavItemConfig[],
  roles: Role[],
  isFeatureEnabled: (flag: string) => boolean,
): NavItemConfig[] {
  const result: NavItemConfig[] = [];

  for (const item of items) {
    if (item.roles && !item.roles.some((role) => roles.includes(role))) continue;
    if (item.permission && !hasPermission(roles, item.permission)) continue;
    if (item.featureFlag && !isFeatureEnabled(item.featureFlag)) continue;

    if (item.children) {
      const children = filterNavigationByAccess(item.children, roles, isFeatureEnabled);
      if (children.length === 0) continue;
      result.push({ ...item, children });
      continue;
    }

    result.push(item);
  }

  return result;
}
