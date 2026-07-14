import type { Metadata } from 'next';
import { ShieldAlert } from 'lucide-react';
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
  const t = await getTranslations({ locale, namespace: 'auth.forbidden' });
  return buildPageMetadata({ locale: locale as AppLocale, path: '/forbidden', title: t('title'), description: t('description') });
}

/** For an authenticated user whose role/permission (RoleGuard/PermissionGuard) doesn't cover the page they tried to reach — distinct from Access Denied, which covers non-role reasons (e.g. a suspended account or tenant mismatch, once those exist). */
export default async function ForbiddenPage() {
  const t = await getTranslations('auth.forbidden');

  return (
    <StatusPage
      icon={ShieldAlert}
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
