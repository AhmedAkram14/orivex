import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { NotificationCenterList } from '@/features/notifications/components/notification-center-list';
import { Container } from '@/shared/ui/container';
import { buildPageMetadata } from '@/shared/lib/seo';
import type { AppLocale } from '@/shared/i18n/routing';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'notificationCenter' });
  return buildPageMetadata({ locale: locale as AppLocale, path: '/notifications', title: t('title'), description: t('description') });
}

/**
 * The Notification Center — every notification ever sent to this account,
 * real-paginated (Notification Center pagination fix; the bell's own
 * popover stays capped at its default limit). Reachable from every role via
 * the bell's "View all" link (`notification-panel.tsx`) rather than a
 * primary nav entry -- a utility page, not a workspace destination.
 */
export default async function NotificationsPage() {
  const t = await getTranslations('notificationCenter');

  return (
    <Container className="flex flex-col gap-6 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-text-primary">{t('title')}</h1>
        <p className="text-text-secondary">{t('description')}</p>
      </div>

      <NotificationCenterList />
    </Container>
  );
}
