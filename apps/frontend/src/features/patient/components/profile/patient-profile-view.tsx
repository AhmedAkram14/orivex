'use client';

import { Mail, Phone } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import type { PatientProfile } from '@/features/patient/api/types';
import { useCountriesList } from '@/features/reference/hooks/use-countries-list';
import { useInsuranceProvidersList } from '@/features/reference/hooks/use-insurance-providers-list';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
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
 * The read-only rendering of a patient's profile — Personal Information
 * (now including gender/nationality/address, Stage O.1/O.7), Medical
 * Information (blood type/allergies/chronic diseases, patient-editable via
 * `PatientProfileForm`, Stage O.3/O.7), Emergency Contacts, Insurance (a
 * real reference-data lookup, Stage O.7), and a Settings foundation
 * placeholder. Used both as the default "View" mode and as the Read-only
 * mode for a viewer without edit access — mirrors `DoctorProfileView`'s
 * pattern exactly.
 */
export function PatientProfileView({ profile }: PatientProfileViewProps) {
  const t = useTranslations('patient.profile');
  const format = useFormatter();
  const { data: countries } = useCountriesList();
  const { data: insuranceProviders } = useInsuranceProvidersList();

  const nationalityName = countries?.find((country) => country.id === profile.nationalityId)?.name;
  const insuranceProviderName = insuranceProviders?.find((provider) => provider.id === profile.insuranceProviderId)?.name;

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
          <div>
            <p className="text-xs text-text-tertiary">{t('gender')}</p>
            <p className="text-sm text-text-secondary">
              {profile.gender ? t(`genderOptions.${profile.gender}`) : t('notOnRecord')}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary">{t('nationality')}</p>
            <p className="text-sm text-text-secondary">{nationalityName ?? t('notOnRecord')}</p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary">{t('address')}</p>
            <p className="text-sm text-text-secondary">{profile.address ?? t('notOnRecord')}</p>
          </div>
        </div>
      </Section>

      <Section title={t('medicalInformation')} description={t('medicalInformationDescription')}>
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs text-text-tertiary">{t('bloodType')}</p>
            <p className="text-sm text-text-secondary">{profile.bloodType ?? t('notOnRecord')}</p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary">{t('allergies')}</p>
            <p className="text-sm text-text-secondary">{profile.allergies || t('noAllergiesOnRecord')}</p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary">{t('chronicConditions')}</p>
            <p className="text-sm text-text-secondary">{profile.chronicDiseases || t('noConditionsOnRecord')}</p>
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
                  {t(`relationshipOptions.${contact.relationship}`)} · {contact.phoneNumber}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={t('emergencyContactsEmptyTitle')} description={t('emergencyContactsEmptyDescription')} />
        )}
      </Section>

      <Section title={t('insurance')}>
        {insuranceProviderName ? (
          <p className="text-sm text-text-secondary">{insuranceProviderName}</p>
        ) : (
          <EmptyState title={t('insuranceUnavailableTitle')} description={t('insuranceUnavailableDescription')} />
        )}
      </Section>

      <Section title={t('settings')}>
        <EmptyState title={t('settingsComingSoonTitle')} description={t('settingsComingSoonDescription')} />
      </Section>
    </div>
  );
}
