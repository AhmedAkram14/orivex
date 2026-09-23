'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useSecuritySummary } from '@/features/auth/hooks/use-security-summary';
import { formatLocation } from '@/features/auth/lib/format-device-location';
import { formatRelativeTime } from '@/shared/lib/date/relative-time';
import { Badge } from '@/shared/ui/badge';
import { Card } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { Alert } from '@/shared/ui/alert';

/**
 * New top-of-page strip (Security Center rework): active session count,
 * last sign-in (relative time + city), and 2FA status. 2FA is a hardcoded
 * "off" state everywhere in this codebase -- see SecuritySummary's own type
 * comment -- so its card here always renders the warning treatment with a
 * "Set up" link, never a real toggle.
 */
export function SecuritySummaryStrip() {
  const t = useTranslations('auth.securityCenter.summary');
  const locale = useLocale();
  const { data: summary, isLoading, isError } = useSecuritySummary();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (isError || !summary) {
    return <Alert variant="danger">{t('loadError')}</Alert>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card className="flex flex-col gap-1 p-4">
        <p className="text-xs font-medium text-text-tertiary">{t('activeSessions')}</p>
        <p className="text-2xl font-semibold text-text-primary">{summary.activeSessionCount}</p>
      </Card>

      <Card className="flex flex-col gap-1 p-4">
        <p className="text-xs font-medium text-text-tertiary">{t('lastSignIn')}</p>
        {summary.lastSignIn ? (
          <>
            <p className="text-sm font-medium text-text-primary">
              {formatRelativeTime(new Date(summary.lastSignIn.at), locale, t('activeNow'))}
            </p>
            <p className="text-xs text-text-secondary">
              {formatLocation(summary.lastSignIn.city, summary.lastSignIn.country, t('unknownLocation'))}
            </p>
          </>
        ) : (
          <p className="text-sm text-text-tertiary">{t('noSignInYet')}</p>
        )}
      </Card>

      <Card className="flex flex-col gap-1 p-4">
        <p className="text-xs font-medium text-text-tertiary">{t('twoFactor')}</p>
        <div className="flex items-center gap-2">
          <Badge variant="warning">{t('twoFactorOff')}</Badge>
        </div>
        {/* Same-page anchor -- a plain <a>, not the locale-aware Link (which expects a routable pathname, not a fragment). */}
        <a href="#two-factor" className="w-fit text-xs font-medium text-primary hover:underline">
          {t('twoFactorSetUp')}
        </a>
      </Card>
    </div>
  );
}
