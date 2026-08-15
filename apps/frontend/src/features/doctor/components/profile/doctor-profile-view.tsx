'use client';

import {
  Award,
  BadgeCheck,
  Book,
  Briefcase,
  Building2,
  CalendarClock,
  History,
  Languages as LanguagesIcon,
  Lock,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { DoctorReviewsList } from '@/features/consultation/components/doctor-reviews-list';
import { useDoctorReviews } from '@/features/consultation/hooks/use-doctor-reviews';
import type { DoctorProfile } from '@/features/doctor/api/types';
import { Heading } from '@/design-system/typography';
import { useDoctorPatients } from '@/features/doctor/hooks/use-doctor-patients';
import { useHospitalsList } from '@/features/doctor/hooks/use-hospitals-list';
import { useMyVerifications } from '@/features/doctor/hooks/use-my-verifications';
import { computeProfileCompletion, type ProfileCompletionField } from '@/features/doctor/lib/profile-completion';
import { getNextAvailability, isSameDay } from '@/features/doctor/lib/week';
import { getCairoNow } from '@/shared/lib/date/timezone';
import { useSpecialtiesList } from '@/features/reference/hooks/use-specialties-list';
import { pickLocalizedName } from '@/shared/i18n/localized-name';
import { useDoctorAvailability } from '@/features/scheduling/hooks/use-doctor-availability';
import { combineDateAndTime } from '@/features/scheduling/utils/time';
import { Link } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { CircularProgress } from '@/shared/ui/charts/circular-progress';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/lib/cn';

const CARD_CLASS = 'rounded-3xl border-border-default shadow-[0_10px_30px_rgba(15,23,42,0.06)]';

function initialsFor(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export interface DoctorProfileViewProps {
  profile: DoctorProfile;
  /**
   * 'workspace' (default): the doctor viewing their own profile from the
   * Doctor Workspace -- gets the full sidebar (Doctor Summary, Availability,
   * Quick Actions, Profile Completion) plus edit affordances, all backed by
   * doctor-self-only hooks (`useDoctorAvailability`/`useDoctorPatients`/
   * `useMyVerifications`). 'public': a patient viewing another doctor's
   * profile (`patient/doctors/[id]/page.tsx`) -- none of those hooks are
   * reachable for a doctor other than the caller, so this variant renders
   * only the profile content itself, never a fabricated stand-in for
   * workspace-only data.
   */
  variant?: 'workspace' | 'public';
  /** Only used in the 'workspace' variant -- opens the page's existing edit mode. */
  onEdit?: () => void;
}

interface InfoRowProps {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary-subtle text-text-tertiary">
        <Icon icon={icon} size="sm" />
      </span>
      <div className="flex flex-col gap-0.5">
        <p className="text-xs text-text-tertiary">{label}</p>
        <p className="text-sm font-medium text-text-primary">{value}</p>
      </div>
    </div>
  );
}

interface ProfileSectionCardProps {
  title: string;
  icon: LucideIcon;
  iconClassName?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

function ProfileSectionCard({ title, icon, iconClassName, actions, children, className }: ProfileSectionCardProps) {
  return (
    <Card className={cn(CARD_CLASS, className)}>
      <CardContent className="flex flex-col gap-5 p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary',
                iconClassName,
              )}
            >
              <Icon icon={icon} size="md" />
            </span>
            <Heading as="h2" level={3}>{title}</Heading>
          </div>
          {actions}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

/**
 * The read-only rendering of a doctor's profile — a premium two-column
 * layout (Professional Information, Experience, About, Languages,
 * Insurance, Publications, Awards, Reviews on the left; Doctor Summary,
 * Availability, Quick Actions, Profile Completion, Contact Information in a
 * sticky right sidebar), matching the redesigned Overview dashboard's visual
 * language (rounded-3xl cards, soft shadows, icon-in-colored-circle rows).
 * Used both as the doctor's own workspace Profile page (`variant="workspace"`,
 * the default) and, unchanged in content, as the patient-facing public
 * profile (`variant="public"`, `patient/doctors/[id]/page.tsx`) — see this
 * component's own prop doc for exactly which pieces are workspace-only and
 * why.
 */
export function DoctorProfileView({ profile, variant = 'workspace', onEdit }: DoctorProfileViewProps) {
  const t = useTranslations('doctor.profile');
  const tRanks = useTranslations('doctor.onboarding.profileStep.professionalRanks');
  const format = useFormatter();
  const locale = useLocale();
  const isWorkspace = variant === 'workspace';

  const { data: specialties } = useSpecialtiesList();
  const { data: hospitals } = useHospitalsList();
  const { data: reviews, isLoading: reviewsLoading } = useDoctorReviews(profile.id);
  const { data: patients } = useDoctorPatients(isWorkspace);
  const { data: availability, isLoading: availabilityLoading } = useDoctorAvailability(isWorkspace);
  const { data: verifications } = useMyVerifications(isWorkspace ? profile.id : undefined);

  const matchedSpecialty = specialties?.find((specialty) => specialty.id === profile.specialtyId);
  const specialtyName = matchedSpecialty
    ? pickLocalizedName(matchedSpecialty.name, matchedSpecialty.nameAr, locale)
    : t('notOnRecord');
  const hospital = hospitals?.find((option) => option.id === profile.hospitalId);

  const isVerified = (verifications ?? []).some((verification) => verification.status === 'approved');

  const nextAvailability = availability ? getNextAvailability(availability, getCairoNow()) : null;
  const isAvailableToday = Boolean(nextAvailability && isSameDay(nextAvailability.date, getCairoNow()));

  const completion = computeProfileCompletion(profile);

  const completionLabels: Record<ProfileCompletionField, string> = {
    biography: t('completion.biography'),
    yearsOfExperience: t('completion.yearsOfExperience'),
    languages: t('completion.languages'),
    consultationFeeAmount: t('completion.consultationFeeAmount'),
    portfolio: t('completion.portfolio'),
    insuranceProviders: t('completion.insuranceProviders'),
    licenseExpiryDate: t('completion.licenseExpiryDate'),
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <Card className={cn(CARD_CLASS, 'overflow-hidden')}>
        <CardContent className="flex flex-col gap-6 p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar size="lg">
                <AvatarFallback>{initialsFor(profile.fullName)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-2xl font-semibold text-text-primary sm:text-[2rem]">{profile.fullName}</p>
                  {isWorkspace && isVerified && (
                    <Badge variant="success" className="gap-1">
                      <Icon icon={BadgeCheck} size="xs" />
                      {t('hero.verified')}
                    </Badge>
                  )}
                </div>
                <p className="text-base text-text-secondary">{specialtyName}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-tertiary">
                  {hospital && (
                    <span className="flex items-center gap-1.5">
                      <Icon icon={Building2} size="sm" />
                      {hospital.name}
                    </span>
                  )}
                  {profile.yearsOfExperience !== undefined && (
                    <span className="flex items-center gap-1.5">
                      <Icon icon={Briefcase} size="sm" />
                      {t('hero.yearsExperience', { years: profile.yearsOfExperience })}
                    </span>
                  )}
                  {isWorkspace && !availabilityLoading && (
                    <span className="flex items-center gap-1.5">
                      <Icon icon={CalendarClock} size="sm" />
                      {isAvailableToday ? t('hero.availableNow') : t('hero.currentlyUnavailable')}
                    </span>
                  )}
                </div>
                {(profile.languages ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {profile.languages.map((language) => (
                      <Badge key={language} variant="neutral">
                        {language.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {isWorkspace && onEdit && (
              <Button variant="outline" onClick={onEdit} className="self-start sm:self-center">
                <Icon icon={Pencil} size="sm" className="me-2" />
                {t('editProfile')}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-border-default pt-6 sm:grid-cols-4">
            {isWorkspace && patients && (
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-info-subtle text-info">
                  <Icon icon={Users} size="md" />
                </span>
                <div>
                  <p className="text-lg font-semibold text-text-primary">{patients.length}</p>
                  <p className="text-xs text-text-tertiary">{t('hero.patientsCount', { count: patients.length })}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-warning-subtle text-warning">
                <Icon icon={Star} size="md" />
              </span>
              <div>
                <p className="text-lg font-semibold text-text-primary">
                  {reviews && reviews.reviewCount > 0 && reviews.averageRating != null ? reviews.averageRating.toFixed(1) : '—'}
                </p>
                <p className="text-xs text-text-tertiary">{t('hero.reviewsCount', { count: reviews?.reviewCount ?? 0 })}</p>
              </div>
            </div>
            {profile.yearsOfExperience !== undefined && (
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-success-subtle text-success">
                  <Icon icon={Briefcase} size="md" />
                </span>
                <div>
                  <p className="text-lg font-semibold text-text-primary">{profile.yearsOfExperience}</p>
                  <p className="text-xs text-text-tertiary">{t('hero.yearsExperience', { years: profile.yearsOfExperience })}</p>
                </div>
              </div>
            )}
            {profile.consultationFeeAmount !== undefined && (
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary-subtle text-primary">
                  <Icon icon={Wallet} size="md" />
                </span>
                <div>
                  <p className={cn('text-lg font-semibold', profile.consultationFeeAmount === 0 ? 'text-success' : 'text-text-primary')}>
                    {profile.consultationFeeAmount === 0
                      ? t('hero.consultationFeeFree')
                      : t('hero.consultationFee', { amount: profile.consultationFeeAmount })}
                  </p>
                  <p className="text-xs text-text-tertiary">{t('consultationFee')}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Two-column body */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Left column (~65%) */}
        <div className="flex flex-col gap-6">
          <ProfileSectionCard title={t('professionalInformation')} icon={Stethoscope}>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <InfoRow icon={Stethoscope} label={t('specialty')} value={specialtyName} />
              <InfoRow icon={ScrollText} label={t('licenseNumber')} value={profile.licenseNumber} />
              <InfoRow
                icon={Briefcase}
                label={t('yearsOfExperienceLabel')}
                value={profile.yearsOfExperience !== undefined ? t('yearsOfExperience', { years: profile.yearsOfExperience }) : t('notOnRecord')}
              />
              <InfoRow icon={Building2} label={t('hospitalAffiliation')} value={hospital?.name ?? t('notOnRecord')} />
              <InfoRow
                icon={Wallet}
                label={t('consultationFee')}
                value={profile.consultationFeeAmount !== undefined ? t('hero.consultationFee', { amount: profile.consultationFeeAmount }) : t('notOnRecord')}
              />
              {hospital?.address && <InfoRow icon={MapPin} label={t('clinicAddress')} value={hospital.address} />}
            </div>
          </ProfileSectionCard>

          <ProfileSectionCard title={t('experienceTimelineTitle')} icon={History} iconClassName="bg-info-subtle text-info">
            {(profile.workExperience ?? []).length > 0 ? (
              <ol className="flex flex-col gap-6">
                {profile.workExperience.map((entry) => {
                  const startYear = new Date(entry.startDate).getFullYear();
                  const endYear = entry.endDate ? new Date(entry.endDate).getFullYear() : t('experiencePresent');
                  return (
                    <li key={entry.id} className="relative flex flex-col gap-1 border-s-2 border-border-default ps-5">
                      <span className="absolute top-1 -start-[7px] size-3 rounded-full bg-primary" aria-hidden="true" />
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-text-primary">{entry.position}</p>
                        {entry.professionalRank && <Badge variant="info">{tRanks(entry.professionalRank)}</Badge>}
                      </div>
                      <p className="text-sm text-text-secondary">{entry.organizationName}</p>
                      <p className="text-xs text-text-tertiary">{t('experienceDateRange', { start: startYear, end: endYear })}</p>
                      {entry.description && <p className="mt-1 text-sm text-text-secondary">{entry.description}</p>}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <EmptyState
                icon={History}
                title={t('experienceEmptyTitle')}
                description={t('experienceEmptyDescription')}
                action={
                  isWorkspace && onEdit ? (
                    <Button variant="outline" size="sm" onClick={onEdit}>
                      {t('addWorkExperience')}
                    </Button>
                  ) : undefined
                }
              />
            )}
          </ProfileSectionCard>

          <ProfileSectionCard title={t('about')} icon={UserRound} iconClassName="bg-secondary-subtle text-text-secondary">
            {profile.biography ? (
              <p className="text-sm leading-relaxed text-text-secondary">{profile.biography}</p>
            ) : (
              <EmptyState
                icon={UserRound}
                title={t('aboutEmptyTitle')}
                description={t('aboutEmptyDescription')}
                action={
                  isWorkspace && onEdit ? (
                    <Button variant="outline" size="sm" onClick={onEdit}>
                      {t('editProfile')}
                    </Button>
                  ) : undefined
                }
              />
            )}
          </ProfileSectionCard>

          <ProfileSectionCard title={t('languages')} icon={LanguagesIcon} iconClassName="bg-info-subtle text-info">
            {(profile.languages ?? []).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.languages.map((language) => (
                  <Badge key={language} variant="info" className="px-3 py-1 text-sm">
                    {language.toUpperCase()}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">{t('notOnRecord')}</p>
            )}
          </ProfileSectionCard>

          <ProfileSectionCard title={t('insurance')} icon={ShieldCheck} iconClassName="bg-success-subtle text-success">
            {(profile.insuranceProviders ?? []).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.insuranceProviders.map((provider) => (
                  <Badge key={provider} variant="success" className="px-3 py-1 text-sm">
                    {provider}
                  </Badge>
                ))}
              </div>
            ) : (
              <EmptyState icon={ShieldCheck} title={t('insuranceEmptyTitle')} description={t('insuranceEmptyDescription')} />
            )}
          </ProfileSectionCard>

          <ProfileSectionCard title={t('publications')} icon={Book} iconClassName="bg-warning-subtle text-warning">
            {(profile.publications ?? []).length > 0 ? (
              <ul className="flex flex-col gap-3">
                {profile.publications.map((publication) => (
                  <li key={publication.id} className="rounded-2xl border border-border-default p-4">
                    <p className="text-sm font-medium text-text-primary">{publication.title}</p>
                    {publication.reference && <p className="mt-0.5 text-xs text-text-tertiary">{publication.reference}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={Book}
                title={t('publicationsEmptyTitle')}
                description={t('publicationsEmptyDescription')}
                action={
                  isWorkspace && onEdit ? (
                    <Button variant="outline" size="sm" onClick={onEdit}>
                      {t('addPublication')}
                    </Button>
                  ) : undefined
                }
              />
            )}
          </ProfileSectionCard>

          <ProfileSectionCard title={t('awards')} icon={Award} iconClassName="bg-danger-subtle text-danger">
            {(profile.awards ?? []).length > 0 ? (
              <ul className="flex flex-col gap-3">
                {profile.awards.map((award) => (
                  <li key={award.id} className="rounded-2xl border border-border-default p-4">
                    <p className="text-sm font-medium text-text-primary">{award.title}</p>
                    {award.issuingBody && <p className="mt-0.5 text-xs text-text-tertiary">{award.issuingBody}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={Award}
                title={t('awardsEmptyTitle')}
                description={t('awardsEmptyDescription')}
                action={
                  isWorkspace && onEdit ? (
                    <Button variant="outline" size="sm" onClick={onEdit}>
                      {t('addAward')}
                    </Button>
                  ) : undefined
                }
              />
            )}
          </ProfileSectionCard>

          <ProfileSectionCard title={t('reviews')} icon={Star} iconClassName="bg-warning-subtle text-warning">
            {reviewsLoading ? <Skeleton className="h-24 w-full" /> : <DoctorReviewsList doctorProfileId={profile.id} />}
          </ProfileSectionCard>
        </div>

        {/* Right sidebar (~35%, sticky on desktop) */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
          {isWorkspace && (
            <Card className={CARD_CLASS}>
              <CardContent className="flex flex-col gap-4 p-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-info-subtle text-info">
                    <Icon icon={CalendarClock} size="md" />
                  </span>
                  <Heading as="h3" level={4}>{t('sidebar.availability')}</Heading>
                </div>
                {availabilityLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : nextAvailability ? (
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-text-tertiary">{isAvailableToday ? t('sidebar.today') : t('sidebar.nextAvailable')}</span>
                      <span className="font-medium text-text-primary">
                        {isAvailableToday
                          ? `${format.dateTime(combineDateAndTime(new Date(0, 0, 0), nextAvailability.day.hours.start), { hour: 'numeric' })} – ${format.dateTime(combineDateAndTime(new Date(0, 0, 0), nextAvailability.day.hours.end), { hour: 'numeric' })}`
                          : format.dateTime(nextAvailability.date, { weekday: 'long', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary">{t('sidebar.noAvailabilityTitle')}</p>
                )}
                <Link href="/doctor/schedule" className="text-sm font-medium text-primary hover:underline">
                  {t('sidebar.viewFullSchedule')}
                </Link>
              </CardContent>
            </Card>
          )}

          {isWorkspace && (
            <Card className={CARD_CLASS}>
              <CardContent className="flex flex-col gap-3 p-6">
                <Heading as="h3" level={4}>{t('sidebar.quickActions')}</Heading>
                <div className="flex flex-col gap-2">
                  {onEdit && (
                    <Button variant="outline" className="justify-start" onClick={onEdit}>
                      <Icon icon={Pencil} size="sm" className="me-2" />
                      {t('editProfile')}
                    </Button>
                  )}
                  <Button variant="outline" className="justify-start" asChild>
                    <Link href="/doctor/schedule">
                      <Icon icon={CalendarClock} size="sm" className="me-2" />
                      {t('sidebar.manageSchedule')}
                    </Link>
                  </Button>
                  <Button variant="outline" className="justify-start" asChild>
                    <Link href="/security">
                      <Icon icon={Lock} size="sm" className="me-2" />
                      {t('sidebar.security')}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isWorkspace && (
            <Card className={CARD_CLASS}>
              <CardContent className="flex flex-col gap-4 p-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-primary-subtle text-primary">
                    <Icon icon={Sparkles} size="md" />
                  </span>
                  <Heading as="h3" level={4}>{t('sidebar.profileCompletion')}</Heading>
                </div>
                <p className="text-sm text-text-secondary">{t('sidebar.profileCompletionDescription')}</p>
                <div className="flex justify-center py-2">
                  <CircularProgress value={completion.percent} max={100} size={140} strokeWidth={12} />
                </div>
                {completion.missingFields.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-medium text-text-tertiary">{t('sidebar.missingItemsTitle')}</p>
                    <ul className="flex flex-col gap-1">
                      {completion.missingFields.map((field) => (
                        <li key={field} className="text-xs text-text-secondary">
                          • {completionLabels[field]}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className={CARD_CLASS}>
            <CardContent className="flex flex-col gap-4 p-6">
              <Heading as="h3" level={4}>{t('contactInformation')}</Heading>
              <div className="flex flex-col gap-3">
                <InfoRow icon={Mail} label={t('email')} value={profile.email} />
                <InfoRow icon={Phone} label={t('phone')} value={profile.phoneNumber ?? t('notOnRecord')} />
                {hospital && <InfoRow icon={Building2} label={t('clinicName')} value={hospital.name} />}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
