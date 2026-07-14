import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LoginForm } from '@/features/auth/components/login-form';
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
  const t = await getTranslations({ locale, namespace: 'auth.login' });
  return buildPageMetadata({ locale: locale as AppLocale, path: '/login', title: t('title'), description: t('subtitle') });
}

export default async function LoginPage() {
  const t = await getTranslations('auth.login');

  return (
    <AuthCard
      title={t('title')}
      description={t('subtitle')}
      footer={
        <>
          {t('noAccount')}{' '}
          <Link href="/register" className="font-medium text-primary hover:underline">
            {t('registerLink')}
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthCard>
  );
}
