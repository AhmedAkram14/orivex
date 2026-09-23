'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import type { DoctorPatientChartProfile } from '@/features/doctor/api/types';
import { getAllergyState } from '../_lib/allergy-state';
import { ageFrom, initialsFor, shortId } from '../_lib/patient-display';

export interface StickyPatientBarProps {
  profile: DoctorPatientChartProfile;
  /** The real header this bar substitutes for once it scrolls out of view -- observed via IntersectionObserver, not a scroll-position calculation re-run on every pixel. */
  headerRef: React.RefObject<HTMLElement | null>;
}

const allergyBadgeVariant = {
  present: 'danger',
  'confirmed-none': 'success',
  'not-asked': 'warning',
} as const;

// Patient Record Page P0 fix: read-only by design (no interactive controls
// of its own) -- not because a sticky element with focusable children would
// "trap" focus (it wouldn't; that was a misdiagnosis), but to avoid
// cluttering the bar with duplicated actions. The real risk a sticky bar
// creates is covering content a keyboard user tabs or anchor-links into
// underneath it -- that's fixed separately, via scroll-margin-top applied
// to the scrollable content in page.tsx, sized to this bar's own height.
export function StickyPatientBar({ profile, headerRef }: StickyPatientBarProps) {
  const t = useTranslations('publicPatient');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const header = headerRef.current;
    // Guards environments with no IntersectionObserver (older browsers, and
    // jsdom's test environment, which doesn't implement it) -- the bar
    // simply never appears rather than crashing the page.
    if (!header || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), {
      rootMargin: '0px',
      threshold: 0,
    });
    observer.observe(header);
    return () => observer.disconnect();
  }, [headerRef]);

  const age = profile.dateOfBirth ? ageFrom(profile.dateOfBirth) : undefined;
  const allergyState = getAllergyState(profile);

  // Mounted only once actually visible -- not always-rendered-but-hidden --
  // so the patient's name/id never exists twice in the DOM (once here, once
  // in the real header/H1) while the doctor hasn't scrolled far enough to
  // need this bar at all.
  if (!visible) return null;

  return (
    <div
      className="sticky top-0 z-(--z-sticky) flex items-center gap-3 rounded-xl border border-border-default bg-surface/95 px-4 py-2.5 shadow-md backdrop-blur"
    >
      <Avatar size="sm" className="shrink-0">
        {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={profile.fullName} />}
        <AvatarFallback className="bg-primary text-primary-foreground">{initialsFor(profile.fullName)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <p className="truncate text-sm font-medium text-text-primary">{profile.fullName}</p>
        <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-text-tertiary">
          {profile.gender && <span>{t(`genderOptions.${profile.gender}`)}</span>}
          {age !== undefined && <span>· {t('ageYearsOld', { age })}</span>}
          <bdi dir="ltr">· {t('patientId', { id: shortId(profile.id) })}</bdi>
        </p>
      </div>
      <Badge variant={allergyBadgeVariant[allergyState.kind]} className="ms-auto shrink-0">
        {allergyState.kind === 'present'
          ? t('allergies')
          : allergyState.kind === 'confirmed-none'
            ? t('noAllergiesOnRecord')
            : t('allergiesNotYetConfirmed')}
      </Badge>
    </div>
  );
}
