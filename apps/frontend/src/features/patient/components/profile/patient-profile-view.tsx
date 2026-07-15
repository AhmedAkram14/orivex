'use client';

import { Mail, Phone } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import type { PatientProfile } from '@/features/patient/api/types';
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

export interface PatientProfileViewProps {
  profile: PatientProfile;
}

/**
 * The read-only rendering of a patient's profile — Personal Information,
 * Medical Information (always read-only — clinical data, never patient-
 * edited), Emergency Contacts, Insurance (honestly not-yet-available, per
 * docs/roadmaps/frontend-master-plan.md's Phase 16 scoping), and a Settings
 * foundation placeholder. Used both as the default "View" mode and as the
 * Read-only mode for a viewer without edit access — mirrors
 * `DoctorProfileView`'s pattern exactly.
 */
export function PatientProfileView({ profile }: PatientProfileViewProps) {
  const t = useTranslations('patient.profile');
  const tGender = useTranslations('patient.profile.gender');
  const format = useFormatter();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Avatar size="lg">
          <AvatarFallback>{initialsFor(profile.fullName)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1">
          <p className="text-lg font-semibold text-text-primary">{profile.fullName}</p>
          <p className="text-sm text-text-secondary">
            {format.dateTime(new Date(profile.dateOfBirth), { year: 'numeric', month: 'long', day: 'numeric' })}
            {' · '}
            {tGender(profile.gender)}
          </p>
        </div>
      </div>

      <Section title={t('personalInformation')}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Icon icon={Mail} size="sm" />
            {profile.email}
          </div>
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Icon icon={Phone} size="sm" />
            {profile.phone}
          </div>
          <p className="text-sm text-text-secondary">{profile.address}</p>
        </div>
      </Section>

      <Section title={t('medicalInformation')} description={t('medicalInformationDescription')}>
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs text-text-tertiary">{t('bloodType')}</p>
            <p className="text-sm text-text-secondary">{profile.medicalInfo.bloodType ?? t('notOnRecord')}</p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary">{t('allergies')}</p>
            {profile.medicalInfo.allergies.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {profile.medicalInfo.allergies.map((allergy) => (
                  <Badge key={allergy} variant="warning">
                    {allergy}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">{t('noAllergiesOnRecord')}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-text-tertiary">{t('chronicConditions')}</p>
            {profile.medicalInfo.chronicConditions.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {profile.medicalInfo.chronicConditions.map((condition) => (
                  <Badge key={condition} variant="neutral">
                    {condition}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">{t('noConditionsOnRecord')}</p>
            )}
          </div>
        </div>
      </Section>

      <Section title={t('emergencyContacts')}>
        {profile.emergencyContacts.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {profile.emergencyContacts.map((contact) => (
              <li key={contact.id} className="flex flex-col gap-0.5">
                <p className="text-sm font-medium text-text-primary">{contact.name}</p>
                <p className="text-sm text-text-secondary">
                  {contact.relationship} · {contact.phone}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={t('emergencyContactsEmptyTitle')} description={t('emergencyContactsEmptyDescription')} />
        )}
      </Section>

      <Section title={t('insurance')}>
        <EmptyState title={t('insuranceUnavailableTitle')} description={t('insuranceUnavailableDescription')} />
      </Section>

      <Section title={t('settings')}>
        <EmptyState title={t('settingsComingSoonTitle')} description={t('settingsComingSoonDescription')} />
      </Section>
    </div>
  );
}
