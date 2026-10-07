import { getTranslations } from 'next-intl/server';
import { Link } from '@/shared/i18n/navigation';
import { env } from '@/shared/lib/env';
import type { AppLocale } from '@/shared/i18n/routing';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/shared/ui/breadcrumb';

export interface PublicBreadcrumbItem {
  label: string;
  /** Omitted on the current page (always the last item). */
  href?: string;
}

/**
 * Home > ... > current page, plus the matching schema.org BreadcrumbList so
 * search results show the same trail. "Home" is prepended automatically.
 */
export async function PublicBreadcrumbs({ locale, items }: { locale: AppLocale; items: PublicBreadcrumbItem[] }) {
  const t = await getTranslations({ locale, namespace: 'publicSite.common' });
  const trail: PublicBreadcrumbItem[] = [{ label: t('home'), href: '/' }, ...items];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: `${env.appUrl}/${locale}${item.href === '/' ? '' : item.href}` } : {}),
    })),
  };

  return (
    <>
      {/* Built from this page's own translated labels, not user input. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumb aria-label={t('breadcrumbLabel')}>
        <BreadcrumbList>
          {trail.map((item, index) => (
            <BreadcrumbItem key={`${item.label}-${index}`}>
              {index > 0 && <BreadcrumbSeparator />}
              {item.href ? (
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </>
  );
}
