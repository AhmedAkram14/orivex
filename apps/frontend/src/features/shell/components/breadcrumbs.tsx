'use client';

import { useTranslations } from 'next-intl';
import { Fragment } from 'react';
import { NAVIGATION_CONFIG, type NavItemConfig } from '@/features/shell/config/navigation';
import { Link, usePathname } from '@/shared/i18n/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/ui/breadcrumb';

interface Trail {
  labelKey: string;
  href?: string;
}

/** Collects every candidate ancestor chain whose leaf `href` matches or prefixes the current path — there can legitimately be more than one, since sibling routes (e.g. `/doctor` and `/doctor/consultation`) both "prefix-match" `/doctor/consultation/x` as plain strings even though only one is the actual ancestor. */
function findAllMatches(items: NavItemConfig[], pathname: string, ancestors: Trail[] = []): Trail[][] {
  const matches: Trail[][] = [];
  for (const item of items) {
    const chain = [...ancestors, { labelKey: item.labelKey, href: item.href }];
    if (item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`))) {
      matches.push(chain);
    }
    if (item.children) {
      matches.push(...findAllMatches(item.children, pathname, chain));
    }
  }
  return matches;
}

/**
 * The chain of ancestors (group, then leaf) for the current path — the
 * breadcrumb trail is derived from the same single source of truth as the
 * sidebar, never authored per page. Picks the *longest* matching `href`
 * among every candidate `findAllMatches` finds: a shorter sibling route
 * (e.g. `/doctor`, Overview) is always a string-prefix of a longer sibling
 * (e.g. `/doctor/consultation`) without being its actual ancestor, so
 * first-match-wins would silently pick the wrong crumb — this bug was
 * caught by this phase's own test suite. Returns `null` for a route the
 * nav config doesn't know about (e.g. a future nested detail page), which
 * callers render nothing for rather than a misleading partial trail.
 */
function findTrail(items: NavItemConfig[], pathname: string): Trail[] | null {
  const matches = findAllMatches(items, pathname);
  if (matches.length === 0) return null;

  return matches.reduce((best, candidate) => {
    const bestHref = best[best.length - 1]?.href ?? '';
    const candidateHref = candidate[candidate.length - 1]?.href ?? '';
    return candidateHref.length > bestHref.length ? candidate : best;
  });
}

/** The breadcrumb trail for the current route, derived from `NAVIGATION_CONFIG` — see `findTrail`. Renders nothing at the dashboard root (a single "Dashboard" crumb has no navigational value) or for a route not represented in the nav config. */
export function AppBreadcrumbs() {
  const t = useTranslations('shell.nav');
  const pathname = usePathname();
  const trail = findTrail(NAVIGATION_CONFIG, pathname);

  if (!trail || trail.length < 2) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {trail.map((crumb, index) => {
          const isLast = index === trail.length - 1;
          return (
            <Fragment key={crumb.labelKey}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isLast || !crumb.href ? (
                  <BreadcrumbPage>{t(crumb.labelKey)}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{t(crumb.labelKey)}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
