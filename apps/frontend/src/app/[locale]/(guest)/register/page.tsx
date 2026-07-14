import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { RegisterForm } from '@/features/auth/components/register-form';
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
  const t = await getTranslations({ locale, namespace: 'auth.register' });
  return buildPageMetadata({ locale: locale as AppLocale, path: '/register', title: t('title'), description: t('subtitle') });
}

export default async function RegisterPage() {
  const t = await getTranslations('auth.register');

  return (
    <AuthCard
      title={t('title')}
      description={t('subtitle')}
      footer={
        <>
          {t('haveAccount')}{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            {t('loginLink')}
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
