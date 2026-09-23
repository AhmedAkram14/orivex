'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useSecuritySummary } from '@/features/auth/hooks/use-security-summary';
import { ChangePasswordForm } from '@/features/auth/components/change-password-form';
import { formatRelativeTime } from '@/shared/lib/date/relative-time';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';

/** Real feature (not a stub): change-password already existed as a fully-built, unmounted form (Doctor Settings Rebuild) -- this mounts it on the Security Center for the first time, alongside the password-last-changed timestamp derived from the account's own PasswordChanged security event. */
export function PasswordSection() {
  const t = useTranslations('auth.securityCenter.password');
  const locale = useLocale();
  const { data: summary, isLoading } = useSecuritySummary();
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {isLoading ? (
        <Skeleton className="h-5 w-48" />
      ) : (
        <p className="text-sm text-text-secondary">
          {summary?.passwordChangedAt
            ? t('lastChanged', { relativeTime: formatRelativeTime(new Date(summary.passwordChangedAt), locale, t('justNow')) })
            : t('neverChanged')}
        </p>
      )}

      {formOpen ? (
        <ChangePasswordForm />
      ) : (
        <Button variant="outline" className="self-start" onClick={() => setFormOpen(true)}>
          {t('changeButton')}
        </Button>
      )}
    </div>
  );
}
