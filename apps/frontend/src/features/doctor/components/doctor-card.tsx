'use client';

import { ArrowRight, BadgeCheck, Briefcase, CalendarCheck, Flame, MapPin, Trophy } from 'lucide-react';
import type { ReactNode } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { formatCurrency } from '@/shared/lib/currency/format-currency';
import { useAuth } from '@/shared/auth/auth-context';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';
import { PersonAvatar } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { SpecialtyChip } from '@/shared/ui/specialty-chip';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';
import { cn } from '@/shared/lib/cn';

export type DoctorCardProfessionalRank = 'resident' | 'registrar' | 'specialist' | 'consultant' | 'professor';

export interface DoctorCardProps {
  doctorProfileId: string;
  fullName: string;
  avatarUrl?: string;
  specialtyLabel: string;
  /** Canonical (English) specialty name -- picks the chip's hue/glyph. Falls back to the label. */
  specialtyName?: string;
  professionalRank?: DoctorCardProfessionalRank;
  yearsOfExperience?: number;
  hospitalName?: string;
  availability?: 'today' | 'tomorrow' | null;
  consultationFeeAmount?: number;
  /** The card renders whatever rating UI its caller passes -- Landing already has the aggregate inline from its own bulk list payload, Browse Doctors fetches it per-card via `DoctorRatingSummary`. Keeping this a slot avoids forcing either caller into the other's data-fetching shape while still sharing one visual design. */
  ratingSlot: ReactNode;
  rankBadge?: 'topRated' | 'mostBooked' | null;
  className?: string;
}

/**
 * UX Reliability Pass (§8): the one real Doctor Card design, shared between
 * the Landing page's Popular Doctors section and the Patient's Browse
 * Doctors page (previously two separate, visually-unrelated
 * implementations) -- and available for any future doctor-listing surface
 * (search results, recommendations) to reuse rather than reinvent. Never
 * renders a field it wasn't given -- `yearsOfExperience`/`hospitalName`/
 * `availability`/`consultationFeeAmount`/`professionalRank`/`rankBadge` are
 * all optional and simply omitted when the caller's own data source doesn't
 * have them, matching this codebase's "no fabricated data" rule.
 */
export function DoctorCard({
  doctorProfileId,
  fullName,
  avatarUrl,
  specialtyLabel,
  specialtyName,
  professionalRank,
  yearsOfExperience,
  hospitalName,
  availability,
  consultationFeeAmount,
  ratingSlot,
  rankBadge,
  className,
}: DoctorCardProps) {
  const t = useTranslations('doctor.card');
  const format = useFormatter();
  const { status, user } = useAuth();
  const profileHref = `/patient/doctors/${doctorProfileId}`;
  const bookHref = `/patient/appointments/book?doctorId=${doctorProfileId}`;
  // Who is looking decides what the two actions do:
  //   signed out  -> both are live and go to sign-in, which returns them to this doctor afterwards;
  //   a patient   -> straight to the profile / booking;
  //   anyone else (doctor, admin, staff) -> booking is for patient accounts only, so Book is shown
  //     unavailable with a one-line reason (the patient-only routes behind it would be a dead end).
  // While the session is still resolving, the patient routes are used: they send a signed-out
  // visitor to sign-in themselves.
  const viewer: 'signedOut' | 'patient' | 'other' =
    status === 'unauthenticated' ? 'signedOut' : status !== 'authenticated' || user?.roles.includes('patient') ? 'patient' : 'other';
  const viaSignIn = (href: string) => `/login?returnTo=${encodeURIComponent(href)}`;

  return (
    <Card className={cn('relative flex h-full min-w-0 flex-col gap-4 p-(--card-pad) transition-shadow duration-(--duration-fast) ease-standard hover:shadow-md', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <PersonAvatar name={fullName} src={avatarUrl} size="lg" />
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="flex items-center gap-1 text-base font-bold text-text-primary">
              <bdi className="min-w-0 wrap-break-word">{fullName}</bdi>
              <Icon icon={BadgeCheck} size="sm" className="shrink-0 text-care-text" label={t('verified')} />
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <SpecialtyChip name={specialtyName ?? specialtyLabel} label={specialtyLabel} />
              {professionalRank && <Badge variant="neutral">{t(`ranks.${professionalRank}`)}</Badge>}
            </div>

            {ratingSlot}
          </div>
        </div>

        {rankBadge && (
          <Badge
            variant={rankBadge === 'topRated' ? 'success' : 'warning'}
            className="absolute top-3 end-3 shrink-0 gap-1"
          >
            <Icon icon={rankBadge === 'topRated' ? Trophy : Flame} size="xs" />
            {rankBadge === 'topRated' ? t('topRated') : t('mostBooked')}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-text-tertiary">
        {yearsOfExperience !== undefined && (
          <span className="flex items-center gap-1.5">
            <Icon icon={Briefcase} size="xs" />
            {t('yearsExperience', { count: yearsOfExperience })}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Icon icon={MapPin} size="xs" />
          {hospitalName ?? t('independentPractice')}
        </span>
        {availability && (
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-success" aria-hidden="true" />
            {availability === 'today' ? t('availableToday') : t('availableTomorrow')}
          </span>
        )}
      </div>

      <span className="h-px w-full bg-border-default" aria-hidden="true" />

      {/* Always rendered so every card in a grid keeps the same footer position; a doctor with no fee on record reads "Fee on request" instead of dropping the row. */}
      <div className="flex flex-col">
        <span className="text-caption text-text-tertiary">{t('consultationFeeLabel')}</span>
        <span
          data-numeric
          className={cn(
            'font-display text-h2',
            consultationFeeAmount === undefined
              ? 'text-text-secondary'
              : consultationFeeAmount === 0
                ? 'text-success'
                : 'text-text-primary',
          )}
        >
          {consultationFeeAmount === undefined
            ? t('consultationFeeOnRequest')
            : consultationFeeAmount === 0
              ? t('consultationFeeFree')
              : formatCurrency(format, consultationFeeAmount, 'EGP')}
        </span>
      </div>

      {viewer === 'other' ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {/* aria-disabled (not disabled) keeps it focusable, so the reason is reachable by keyboard too. */}
              <Button
                type="button"
                size="sm"
                aria-disabled="true"
                onClick={(event) => event.preventDefault()}
                className="mt-auto w-full cursor-not-allowed gap-1.5 bg-surface-2 text-text-tertiary hover:bg-surface-2"
              >
                <Icon icon={CalendarCheck} size="sm" />
                {t('book')}
                <span className="sr-only">. {t('bookPatientsOnly')}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('bookPatientsOnly')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        // Two equal actions that wrap onto two lines when the card is narrow -- never a truncated label.
        <div className="mt-auto flex flex-wrap gap-2">
          <Button asChild variant="ghost" size="sm" className="min-w-0 flex-1 basis-28 gap-1">
            <Link href={viewer === 'signedOut' ? viaSignIn(profileHref) : profileHref}>
              {t('viewProfile')}
              <Icon icon={ArrowRight} size="sm" flipRtl />
            </Link>
          </Button>
          <Button asChild size="sm" className="min-w-0 flex-1 basis-28 gap-1.5">
            <Link href={viewer === 'signedOut' ? viaSignIn(bookHref) : bookHref}>
              <Icon icon={CalendarCheck} size="sm" />
              {t('book')}
            </Link>
          </Button>
        </div>
      )}
    </Card>
  );
}
