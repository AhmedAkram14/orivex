'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';

/**
 * Explicit stub -- no 2FA/MFA implementation exists anywhere in this
 * codebase (only an unused `mfaRequired` placeholder on the login response
 * type). Rather than build a from-scratch security feature as part of this
 * page rework, this is an honestly-labeled "not available yet" card with a
 * visibly disabled action, matching the task's own "stub it and tell me"
 * fallback for features the app doesn't support.
 */
export function TwoFactorSection() {
  const t = useTranslations('auth.securityCenter.twoFactor');

  return (
    <div className="flex flex-col gap-3">
      <Badge variant="warning" className="w-fit">
        {t('status')}
      </Badge>
      <p className="text-sm text-text-secondary">{t('description')}</p>
      <Button variant="outline" className="self-start" disabled aria-disabled="true">
        {t('enableButton')}
      </Button>
    </div>
  );
}
