'use client';

import { CalendarDays } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useAuth } from '@/shared/auth/auth-context';
import { Icon } from '@/shared/icons/icon';

function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

function greetingPeriod(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

/**
 * The Patient Portal's compact greeting bar — a time-of-day greeting, a
 * one-line subtitle, and today's date. Deliberately not a `Card` (no
 * avatar, no border, no padding box): the redesigned dashboard's hierarchy
 * reserves that visual weight for the Next Appointment hero below, so this
 * only has to establish context in as little vertical space as possible.
 */
export function WelcomeHeader() {
  const t = useTranslations('patient.dashboard');
  const format = useFormatter();
  const { user } = useAuth();

  if (!user) return null;

  const now = new Date();

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xl font-semibold text-text-primary">
        {t(`greeting.${greetingPeriod(now.getHours())}`, { name: firstNameOf(user.fullName) })}
      </p>
      <p className="text-sm text-text-secondary">{t('welcomeSubtitle')}</p>
      <div className="mt-1 flex items-center gap-1.5 text-sm text-text-tertiary">
        <Icon icon={CalendarDays} size="sm" />
        {format.dateTime(now, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </div>
  );
}
