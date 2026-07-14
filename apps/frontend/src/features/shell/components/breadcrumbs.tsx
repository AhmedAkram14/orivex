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

/** Walks the nav config for the chain of ancestors (group, then leaf) whose `href` matches or prefixes the current path — the breadcrumb trail is derived from the same single source of truth as the sidebar, never authored per page. Returns `null` for a route the nav config doesn't know about (e.g. a future nested detail page), which callers render nothing for rather than a misleading partial trail. */
function findTrail(items: NavItemConfig[], pathname: string, ancestors: Trail[] = []): Trail[] | null {
  for (const item of items) {
    const chain = [...ancestors, { labelKey: item.labelKey, href: item.href }];
    if (item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`))) {
      return chain;
    }
    if (item.children) {
      const found = findTrail(item.children, pathname, chain);
      if (found) return found;
    }
  }
  return null;
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
