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

/**
 * Reached when Silent Refresh Architecture's background refresh fails
 * (features/auth/hooks/use-silent-refresh.ts) -- a session that was valid,
 * then wasn't, distinct from Unauthorized (never had one). Phase 9
 * [VERIFY]: `RequireAuth` now actually routes here (via
 * `shared/auth/session-expired-flag.ts`) instead of always bouncing to
 * `/unauthorized`; `returnTo` is forwarded to `/login` exactly like
 * `/unauthorized` already does, so the visitor lands back where they were
 * after signing back in.
 */
export default async function SessionExpiredPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const t = await getTranslations('auth.sessionExpired');
  const { returnTo } = await searchParams;
  const signInHref = returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : '/login';

  return (
    <StatusPage
      icon={Clock}
      title={t('title')}
      description={t('description')}
      action={
        <Button asChild>
          <Link href={signInHref}>{t('signInAgain')}</Link>
        </Button>
      }
    />
  );
}
