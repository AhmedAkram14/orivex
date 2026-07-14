import type { Metadata } from 'next';
import { Clock } from 'lucide-react';
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
  const t = await getTranslations({ locale, namespace: 'auth.sessionExpired' });
  return buildPageMetadata({ locale: locale as AppLocale, path: '/session-expired', title: t('title'), description: t('description') });
}

/** Reached when Silent Refresh Architecture's background refresh fails (features/auth/hooks/use-silent-refresh.ts) -- a session that was valid, then wasn't, distinct from Unauthorized (never had one). */
export default async function SessionExpiredPage() {
  const t = await getTranslations('auth.sessionExpired');

  return (
    <StatusPage
      icon={Clock}
      title={t('title')}
      description={t('description')}
      action={
        <Button asChild>
          <Link href="/login">{t('signInAgain')}</Link>
        </Button>
      }
    />
  );
}
