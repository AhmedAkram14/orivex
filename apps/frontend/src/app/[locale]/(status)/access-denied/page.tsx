import type { Metadata } from 'next';
import { Ban } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { StatusPage } from '@/features/auth/components/status-page';
import { Link } from '@/shared/i18n/navigation';
import { Button } from '@/shared/ui/button';
import { buildPageMetadata } from '@/shared/lib/seo';
import type { AppLocale } from '@/shared/i18n/routing';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.accessDenied' });
  return buildPageMetadata({ locale: locale as AppLocale, path: '/access-denied', title: t('title'), description: t('description') });
}

/** A broader denial than Forbidden — not "you lack this role," but "this account/resource itself isn't accessible to you" (e.g. a suspended account or cross-tenant access attempt, once Phase 19's multi-tenant model exists). Kept as its own page now, per this phase's explicit scope, rather than merged into Forbidden's copy. */
export default async function AccessDeniedPage() {
  const t = await getTranslations('auth.accessDenied');

  return (
    <StatusPage
      icon={Ban}
      title={t('title')}
      description={t('description')}
      action={
        <Button asChild variant="outline">
          <Link href="/">{t('backHome')}</Link>
        </Button>
      }
    />
  );
}
