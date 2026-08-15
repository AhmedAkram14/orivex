import type { NavItemConfig } from '@/features/shell/config/navigation';

/**
 * Returns the single href from `hrefs` that best matches `pathname` -- the
 * longest exact-or-prefix match, or `null` if none match at all.
 *
 * A plain prefix check per item in isolation is not enough: a workspace's
 * own root href (e.g. `/patient`, the "Overview" item) is always a literal
 * path-prefix of every other page in that workspace (`/patient/doctors`,
 * `/patient/appointments/...`), so every item and Overview would "match"
 * simultaneously. Picking the longest match makes the most specific item
 * win without any component needing to special-case which item is the
 * workspace root -- Overview only wins when nothing more specific does.
 */
export function getActiveNavHref(pathname: string, hrefs: readonly string[]): string | null {
  let best: string | null = null;
  for (const href of hrefs) {
    const matches = href === '/' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
    if (!matches) continue;
    if (best === null || href.length > best.length) {
      best = href;
    }
  }
  return best;
}

/** Flattens every real (non-group) href out of an already-filtered nav tree, for feeding into `getActiveNavHref`. */
export function flattenNavHrefs(items: readonly NavItemConfig[]): string[] {
  const hrefs: string[] = [];
  for (const item of items) {
    if (item.children) {
      hrefs.push(...flattenNavHrefs(item.children));
    } else if (item.href) {
      hrefs.push(item.href);
    }
  }
  return hrefs;
}
