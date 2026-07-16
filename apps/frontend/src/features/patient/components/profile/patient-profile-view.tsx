'use client';

import { Mail, Phone } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import type { PatientMedicalInfo, PatientProfile } from '@/features/patient/api/types';
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

// No ClinicalModule exists yet, so the real backend never returns medical
// data at all (see PatientProfile's own doc comment) — this constant is the
// honest "not on record" state every patient sees, not a per-patient value.
const EMPTY_MEDICAL_INFO: PatientMedicalInfo = { bloodType: undefined, allergies: [], chronicConditions: [] };

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
  const format = useFormatter();
  const medicalInfo = EMPTY_MEDICAL_INFO;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Avatar size="lg">
          <AvatarFallback>{initialsFor(profile.fullName)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1">
          <p className="text-lg font-semibold text-text-primary">{profile.fullName}</p>
          {profile.dateOfBirth && (
            <p className="text-sm text-text-secondary">
              {format.dateTime(new Date(profile.dateOfBirth), { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          )}
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
            {profile.phoneNumber ?? t('notOnRecord')}
          </div>
        </div>
      </Section>

      <Section title={t('medicalInformation')} description={t('medicalInformationDescription')}>
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs text-text-tertiary">{t('bloodType')}</p>
            <p className="text-sm text-text-secondary">{medicalInfo.bloodType ?? t('notOnRecord')}</p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary">{t('allergies')}</p>
            {medicalInfo.allergies.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {medicalInfo.allergies.map((allergy) => (
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
            {medicalInfo.chronicConditions.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {medicalInfo.chronicConditions.map((condition) => (
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
                  {contact.relationship} · {contact.phoneNumber}
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
