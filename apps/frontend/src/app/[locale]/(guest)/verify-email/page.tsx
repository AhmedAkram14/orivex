import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { VerifyEmailStatus } from '@/features/auth/components/verify-email-status';
import { AuthCard } from '@/features/auth/components/auth-card';
import { buildPageMetadata } from '@/shared/lib/seo';
import type { AppLocale } from '@/shared/i18n/routing';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.verifyEmail' });
  return buildPageMetadata({ locale: locale as AppLocale, path: '/verify-email', title: t('title'), description: '' });
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const t = await getTranslations('auth.verifyEmail');
  const { token } = await searchParams;

  return (
    <AuthCard title={t('title')}>
      {token ? <VerifyEmailStatus token={token} /> : <p className="text-sm text-danger">{t('missingToken')}</p>}
    </AuthCard>
  );
}
