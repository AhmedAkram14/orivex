'use client';

import { Mail, Phone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DoctorRatingSummary } from '@/features/consultation/components/doctor-rating-summary';
import { DoctorReviewsList } from '@/features/consultation/components/doctor-reviews-list';
import type { DoctorProfile } from '@/features/doctor/api/types';
import { useSpecialtiesList } from '@/features/reference/hooks/use-specialties-list';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/icons/icon';
import { Section } from '@/shared/ui/layout/section';

function initialsFor(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export interface DoctorProfileViewProps {
  profile: DoctorProfile;
}

/**
 * The read-only rendering of a doctor's profile — Professional Information
 * (`biography`), Experience, Languages, Publications, Awards, and Contact
 * Information (`email`/`phoneNumber`, composed from Account). The old
 * "Qualifications" and "Availability" sections are gone: neither field
 * exists on the real backend (see `DoctorProfile`'s own doc comment) —
 * `publications`/`awards` are the real, distinct concepts DoctorModule
 * actually stores instead. Used both as the default "View" mode and as the
 * Read-only mode for a viewer without edit access (same component either
 * way — there is no separate read-only variant to keep in sync).
 */
export function DoctorProfileView({ profile }: DoctorProfileViewProps) {
  const t = useTranslations('doctor.profile');
  const { data: specialties } = useSpecialtiesList();
  const specialtyName = specialties?.find((specialty) => specialty.id === profile.specialtyId)?.name ?? t('notOnRecord');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Avatar size="lg">
          <AvatarFallback>{initialsFor(profile.fullName)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1">
          <p className="text-lg font-semibold text-text-primary">{profile.fullName}</p>
          <p className="text-sm text-text-secondary">{specialtyName}</p>
          <DoctorRatingSummary doctorProfileId={profile.id} />
        </div>
      </div>

      <Section title={t('professionalInformation')}>
        <p className="text-sm text-text-secondary">{profile.biography ?? t('notOnRecord')}</p>
      </Section>

      <Section title={t('experience')}>
        <p className="text-sm text-text-secondary">
          {profile.yearsOfExperience !== undefined
            ? t('yearsOfExperience', { years: profile.yearsOfExperience })
            : t('notOnRecord')}
        </p>
      </Section>

      <Section title={t('languages')}>
        <div className="flex flex-wrap gap-2">
          {profile.languages.map((language) => (
            <Badge key={language} variant="neutral">
              {language.toUpperCase()}
            </Badge>
          ))}
        </div>
      </Section>

      <Section title={t('publications')}>
        {profile.publications.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {profile.publications.map((publication) => (
              <li key={publication.id} className="text-sm text-text-secondary">
                {publication.title}
                {publication.reference && <span className="text-text-tertiary"> · {publication.reference}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={t('publicationsEmptyTitle')} />
        )}
      </Section>

      <Section title={t('awards')}>
        {profile.awards.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {profile.awards.map((award) => (
              <li key={award.id} className="text-sm text-text-secondary">
                {award.title}
                {award.issuingBody && <span className="text-text-tertiary"> · {award.issuingBody}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={t('awardsEmptyTitle')} />
        )}
      </Section>

      <Section title={t('reviews')}>
        <DoctorReviewsList doctorProfileId={profile.id} />
      </Section>

      <Section title={t('contactInformation')}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Icon icon={Mail} size="sm" />
            {profile.email}
          </div>
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Icon icon={Phone} size="sm" />
            {profile.phoneNumber ?? t('notOnRecord')}
          </div>
        </div>
      </Section>
    </div>
  );
}
