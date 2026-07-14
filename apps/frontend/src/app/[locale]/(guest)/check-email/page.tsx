import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
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
  const t = await getTranslations({ locale, namespace: 'auth.checkEmail' });
  return buildPageMetadata({ locale: locale as AppLocale, path: '/check-email', title: t('title'), description: '' });
}

/** The interstitial shown after registration (verify-email link sent) or a forgot-password request (reset link sent) — the same page, distinguished only by copy, since the underlying UX ("we emailed you a link") is identical. */
export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; reason?: 'register' | 'forgot-password' }>;
}) {
  const t = await getTranslations('auth.checkEmail');
  const { email, reason = 'register' } = await searchParams;

  return (
    <AuthCard
      title={t('title')}
      description={email ? t('descriptionWithEmail', { email }) : t('description')}
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t('backToLogin')}
        </Link>
      }
    >
      <p className="text-center text-sm text-text-secondary">
        {reason === 'register' ? t('reasonRegister') : t('reasonForgotPassword')}
      </p>
    </AuthCard>
  );
}
