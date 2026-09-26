'use client';

import { useTranslations } from 'next-intl';
import { usePatientProfile } from '@/features/patient/hooks/use-patient-profile';
import { getOptionalProfileGaps, OPTIONAL_PROFILE_FIELDS } from '@/features/patient/lib/profile-completeness';
import { Link } from '@/shared/i18n/navigation';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';

const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * The Overview's optional nudge (replaces the old mandatory medical form):
 * a completion ring plus what is still empty, linking to the profile page.
 * Renders nothing while loading or once everything is filled in.
 */
export function ProfileNudgeCard() {
  const t = useTranslations('profileFlow');
  const { data: profile } = usePatientProfile();
  if (!profile) return null;

  const gaps = getOptionalProfileGaps(profile);
  if (gaps.length === 0) return null;

  const total = OPTIONAL_PROFILE_FIELDS.length;
  const done = total - gaps.length;
  const percent = Math.round((done / total) * 100);

  return (
    <Card className="flex flex-col gap-4 p-(--card-pad) sm:flex-row sm:items-center">
      <svg
        viewBox="0 0 48 48"
        className="size-14 shrink-0 -rotate-90"
        role="img"
        aria-label={t('nudgeRing', { percent })}
      >
        <circle cx="24" cy="24" r={RADIUS} fill="none" strokeWidth="5" className="stroke-surface-2" />
        <circle
          cx="24"
          cy="24"
          r={RADIUS}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - done / total)}
          className="stroke-pulse transition-[stroke-dashoffset] duration-(--duration-slow) ease-standard"
        />
      </svg>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className="text-h3 text-text-primary">{t('nudgeTitle')}</h2>
        <p className="text-small text-text-secondary">
          {t('nudgeProgress', { done, total })} · {t('nudgeDescription')}
        </p>
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {gaps.map((gap) => (
            <li key={gap} className="rounded-full bg-surface-2 px-2.5 py-1 text-caption text-text-secondary">
              {t(`gaps.${gap}`)}
            </li>
          ))}
        </ul>
      </div>
      <Button asChild variant="secondary">
        <Link href="/patient/profile">{t('nudgeCta')}</Link>
      </Button>
    </Card>
  );
}
