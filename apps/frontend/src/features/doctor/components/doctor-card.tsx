import { ArrowRight, BadgeCheck, Briefcase, CalendarCheck, Flame, MapPin, Stethoscope, Trophy } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Badge, type BadgeProps } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { cn } from '@/shared/lib/cn';

function initialsOf(fullName: string): string {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export type DoctorCardProfessionalRank = 'resident' | 'registrar' | 'specialist' | 'consultant' | 'professor';

export interface DoctorCardProps {
  doctorProfileId: string;
  fullName: string;
  avatarUrl?: string;
  specialtyLabel: string;
  specialtyBadgeVariant?: BadgeProps['variant'];
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
  specialtyBadgeVariant = 'primary',
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

  return (
    <Card className={cn('relative flex h-full flex-col gap-4 rounded-2xl p-6 pb-4 transition-shadow duration-(--duration-fast) ease-standard hover:shadow-md', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <Avatar size="lg" className="size-20">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
            <AvatarFallback>{initialsOf(fullName)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1 text-base font-bold text-text-primary">
              {fullName}
              <Icon icon={BadgeCheck} size="sm" className="shrink-0 text-primary" aria-label={t('verified')} />
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant={specialtyBadgeVariant} className="w-fit gap-1">
                <Icon icon={Stethoscope} size="xs" />
                {specialtyLabel}
              </Badge>
              {professionalRank && <Badge variant="neutral">{t(`ranks.${professionalRank}`)}</Badge>}
            </div>

            {ratingSlot}
          </div>
        </div>

        {rankBadge && (
          <Badge
            variant={rankBadge === 'topRated' ? 'success' : 'warning'}
            className="absolute top-0 end-0 shrink-0 gap-1 rounded-lg px-2 py-2"
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

      {consultationFeeAmount !== undefined && (
        <div className="flex flex-col">
          <span className="text-xs text-text-tertiary">{t('consultationFeeLabel')}</span>
          <span className={cn('text-base font-bold', consultationFeeAmount === 0 ? 'text-success' : 'text-text-primary')}>
            {consultationFeeAmount === 0 ? t('consultationFeeFree') : t('consultationFee', { amount: consultationFeeAmount })}
          </span>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-8">
        <Link
          href={`/patient/doctors/${doctorProfileId}`}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:text-primary-hover"
        >
          {t('viewProfile')}
          <Icon icon={ArrowRight} size="sm" flipRtl />
        </Link>
        <Button asChild size="sm" className="flex-1 gap-1.5">
          <Link href={`/patient/appointments/book?doctorId=${doctorProfileId}`}>
            <Icon icon={CalendarCheck} size="sm" />
            {t('bookAppointment')}
          </Link>
        </Button>
      </div>
    </Card>
  );
}
