import type { Metadata } from 'next';
import { Lock } from 'lucide-react';
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
  const t = await getTranslations({ locale, namespace: 'auth.accountLocked' });
  return buildPageMetadata({ locale: locale as AppLocale, path: '/account-locked', title: t('title'), description: t('description') });
}

export default async function AccountLockedPage() {
  const t = await getTranslations('auth.accountLocked');

  return (
    <StatusPage
      icon={Lock}
      title={t('title')}
      description={t('description')}
      action={
        <Button asChild variant="outline">
          <Link href="/forgot-password">{t('resetPasswordLink')}</Link>
        </Button>
      }
    />
  );
}
