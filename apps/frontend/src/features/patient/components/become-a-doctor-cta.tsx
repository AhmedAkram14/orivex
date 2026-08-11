'use client';

import { Stethoscope } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';

/**
 * The redesigned "My Health" dashboard's secondary "Become a Doctor" CTA —
 * deliberately a small contextual banner, not an equal-weight dashboard
 * card like the old Quick Actions grid gave it. The page only renders this
 * when `useJourneyStatus().hasDoctorProfile` is false (checked by the
 * caller), so it never appears for an account that already applied/was
 * promoted -- `/doctor/onboarding` itself redirects such an account away,
 * this just avoids showing the dead-end CTA in the first place.
 */
export function BecomeADoctorCta() {
  const t = useTranslations('patient.dashboard.becomeADoctor');

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border-default bg-secondary-subtle p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-text-secondary">
          <Icon icon={Stethoscope} size="sm" />
        </span>
        <p className="text-sm font-medium text-text-primary">{t('title')}</p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href="/doctor/onboarding">{t('action')}</Link>
      </Button>
    </div>
  );
}
