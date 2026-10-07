import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { OAUTH_ERROR_CODES, type OAuthErrorCode } from '@/features/auth/api/types';
import { AuthCard } from '@/features/auth/components/auth-card';
import { OAuthCallbackPending } from '@/features/auth/components/oauth-callback-pending';
import { Link, redirect } from '@/shared/i18n/navigation';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.oauthCallback');
  // A transient hand-off page, never a search result.
  return { title: t('title'), robots: { index: false, follow: false } };
}

const KNOWN_ERRORS = new Set<string>(Object.values(OAUTH_ERROR_CODES));

/**
 * The backend's Social Sign-In callback (docs/14-adrs.md ADR-008) redirects
 * here: with `?error=<code>` when sign-in was refused, otherwise (optionally
 * with `?returnTo=`) once the session cookie is set.
 */
export default async function OAuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations('auth.oauthCallback');

  if (error === OAUTH_ERROR_CODES.accountLocked) {
    redirect({ href: '/account-locked', locale });
  }

  const backToLogin = (
    <Link href="/login" className="font-medium text-primary hover:underline">
      {t('backToLogin')}
    </Link>
  );

  if (error) {
    const code = (KNOWN_ERRORS.has(error) ? error : OAUTH_ERROR_CODES.failed) as OAuthErrorCode;
    return <AuthCard title={t('errorTitle')} description={t(`errors.${code}`)} footer={backToLogin}>{null}</AuthCard>;
  }

  return (
    <OAuthCallbackPending
      failure={
        <AuthCard title={t('errorTitle')} description={t('errors.session_failed')} footer={backToLogin}>
          {null}
        </AuthCard>
      }
    />
  );
}
