'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { Heading } from '@/design-system/typography';
import { useAuth } from '@/shared/auth/auth-context';
import { getCairoNow } from '@/shared/lib/date/timezone';

function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

function greetingPeriod(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

/**
 * The Patient Portal's greeting -- the page's one h1, in the display face,
 * inside the patient HeroSurface. A time-of-day greeting (read from Cairo's
 * wall clock, since ORIVEX is a single-market product), one line of context
 * and today's date.
 */
export function WelcomeHeader() {
  const t = useTranslations('patient.dashboard');
  const format = useFormatter();
  const { user } = useAuth();

  if (!user) return null;

  const now = new Date();
  const cairoNow = getCairoNow(now);

  return (
    <div className="flex flex-col gap-1">
      <Heading as="h1" level={1} className="text-display">
        {t(`greeting.${greetingPeriod(cairoNow.getHours())}`, { name: firstNameOf(user.fullName) })}
        <span aria-hidden="true"> 👋</span>
      </Heading>
      <p className="text-body text-text-secondary">{t('welcomeSubtitle')}</p>
      <p className="text-small text-text-tertiary">
        {format.dateTime(now, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>
  );
}
