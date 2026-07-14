import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';
import { AuthCard } from '@/features/auth/components/auth-card';
import { Link } from '@/shared/i18n/navigation';
import { buildPageMetadata } from '@/shared/lib/seo';
import type { AppLocale } from '@/shared/i18n/routing';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.forgotPassword' });
  return buildPageMetadata({
    locale: locale as AppLocale,
    path: '/forgot-password',
    title: t('title'),
    description: t('subtitle'),
  });
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations('auth.forgotPassword');

  return (
    <AuthCard
      title={t('title')}
      description={t('subtitle')}
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t('backToLogin')}
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
