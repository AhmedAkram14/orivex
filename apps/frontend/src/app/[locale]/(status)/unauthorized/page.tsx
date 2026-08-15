import type { Metadata } from 'next';
import { LogIn, Lock, Shield, Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { StatusPage } from '@/features/auth/components/status-page';
import { Link } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { Button } from '@/shared/ui/button';
import { buildPageMetadata } from '@/shared/lib/seo';
import type { AppLocale } from '@/shared/i18n/routing';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.unauthorized' });
  return buildPageMetadata({ locale: locale as AppLocale, path: '/unauthorized', title: t('title'), description: t('description') });
}

/** For a visitor with no session at all attempting a protected page — distinct from Session Expired (had a session, it ended) and Forbidden (has a session, lacks a role/permission). */
export default async function UnauthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const t = await getTranslations('auth.unauthorized');
  const { returnTo } = await searchParams;
  // Public Landing Page (2026-07-29): forwards RequireAuth's returnTo along
  // to /login, so a visitor who arrived here from a real deep link (e.g. a
  // specialty/doctor picked on the landing page) lands back there after
  // signing in instead of always on /dashboard.
  const signInHref = returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : '/login';

  const trustBadges = [
    { icon: Shield, title: t('trust.secureTitle'), description: t('trust.secureDescription') },
    { icon: Users, title: t('trust.trustedTitle'), description: t('trust.trustedDescription') },
  ];

  return (
    <StatusPage
      icon={LogIn}
      title={t('title')}
      description={t('description')}
      action={
        <Button asChild size="lg">
          <Link href={signInHref}>
            <Icon icon={Lock} size="sm" />
            {t('signIn')}
          </Link>
        </Button>
      }
      footer={
        <div className="mt-4 flex max-w-2xl flex-wrap items-start justify-center gap-x-8 gap-y-6">
          {trustBadges.map(({ icon, title, description }, index) => (
            <div
              key={title}
              className={`flex max-w-56 items-start gap-3 text-left ${index > 0 ? 'border-l border-border-default pl-8' : ''}`}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary-emphasis">
                <Icon icon={icon} size="sm" />
              </div>
              <div>
                <p className="text-sm font-semibold whitespace-nowrap text-text-primary">{title}</p>
                <p className="max-w-40 text-xs text-text-secondary">{description}</p>
              </div>
            </div>
          ))}
        </div>
      }
    />
  );
}
