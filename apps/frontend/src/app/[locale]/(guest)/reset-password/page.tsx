import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form';
import { AuthCard } from '@/features/auth/components/auth-card';
import { buildPageMetadata } from '@/shared/lib/seo';
import type { AppLocale } from '@/shared/i18n/routing';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.resetPassword' });
  return buildPageMetadata({
    locale: locale as AppLocale,
    path: '/reset-password',
    title: t('title'),
    description: t('subtitle'),
  });
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const t = await getTranslations('auth.resetPassword');
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthCard title={t('title')}>
        <p className="text-sm text-danger">{t('missingToken')}</p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('title')} description={t('subtitle')}>
      <ResetPasswordForm token={token} />
    </AuthCard>
  );
}
