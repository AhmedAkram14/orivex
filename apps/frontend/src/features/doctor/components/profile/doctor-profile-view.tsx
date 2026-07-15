'use client';

import { Mail, Phone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { DoctorProfile } from '@/features/doctor/api/types';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
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

/** The read-only rendering of a doctor's profile — every section (Professional Information, Qualifications, Experience, Availability, Languages, Contact Information) the phase's scope calls for. Used both as the default "View" mode and as the Read-only mode for a viewer without edit access (same component either way — there is no separate read-only variant to keep in sync). */
export function DoctorProfileView({ profile }: DoctorProfileViewProps) {
  const t = useTranslations('doctor.profile');
  const tDays = useTranslations('doctor.profile.days');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Avatar size="lg">
          <AvatarFallback>{initialsFor(profile.fullName)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1">
          <p className="text-lg font-semibold text-text-primary">{profile.fullName}</p>
          <p className="text-sm text-text-secondary">{profile.specialization}</p>
        </div>
      </div>

      <Section title={t('professionalInformation')}>
        <p className="text-sm text-text-secondary">{profile.bio}</p>
      </Section>

      <Section title={t('qualifications')}>
        <ul className="flex flex-col gap-2">
          {profile.qualifications.map((qualification) => (
            <li key={qualification.id} className="text-sm text-text-secondary">
              {qualification.title}
              {qualification.year && <span className="text-text-tertiary"> · {qualification.year}</span>}
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t('experience')}>
        <p className="text-sm text-text-secondary">{t('yearsOfExperience', { years: profile.yearsOfExperience })}</p>
      </Section>

      <Section title={t('availability')}>
        <p className="text-sm text-text-secondary">
          {profile.availability.daysAvailable.map((day) => tDays(day)).join(', ')}
        </p>
        <p className="text-sm text-text-secondary">{profile.availability.hoursLabel}</p>
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

      <Section title={t('contactInformation')}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Icon icon={Mail} size="sm" />
            {profile.email}
          </div>
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Icon icon={Phone} size="sm" />
            {profile.phone}
          </div>
        </div>
      </Section>
    </div>
  );
}
