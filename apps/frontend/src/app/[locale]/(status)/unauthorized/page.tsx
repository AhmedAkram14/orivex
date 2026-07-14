import type { Metadata } from 'next';
import { LogIn } from 'lucide-react';
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
  const t = await getTranslations({ locale, namespace: 'auth.unauthorized' });
  return buildPageMetadata({ locale: locale as AppLocale, path: '/unauthorized', title: t('title'), description: t('description') });
}

/** For a visitor with no session at all attempting a protected page — distinct from Session Expired (had a session, it ended) and Forbidden (has a session, lacks a role/permission). */
export default async function UnauthorizedPage() {
  const t = await getTranslations('auth.unauthorized');

  return (
    <StatusPage
      icon={LogIn}
      title={t('title')}
      description={t('description')}
      action={
        <Button asChild>
          <Link href="/login">{t('signIn')}</Link>
        </Button>
      }
    />
  );
}
