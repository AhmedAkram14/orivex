'use client';

import { useLocale, useTranslations } from 'next-intl';
import { DEFAULT_TIME_ZONE, getTimezoneOffsetLabel } from '@/features/scheduling/utils/timezone';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

/**
 * Doctor Settings Rebuild, Phase 6 / Confirmed decision 3: read-only, no
 * form, no state, no mutation. Orivex Egypt V1 hardcodes one operating
 * timezone across 4 files by deliberate design -- unwinding that into a
 * real per-user override is out of scope for this pass -- so this just
 * surfaces the same real `getTimezoneOffsetLabel()` helper the Schedule
 * page's own `timezoneNote` already uses, so the two never disagree.
 */
export function TimezoneSection() {
  const t = useTranslations('doctor.settingsPage.timezone');
  const locale = useLocale();
  const offsetLabel = getTimezoneOffsetLabel(DEFAULT_TIME_ZONE, locale);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-text-primary">{t('label', { timezone: DEFAULT_TIME_ZONE, offset: offsetLabel })}</p>
      </CardContent>
    </Card>
  );
}
