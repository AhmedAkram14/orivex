'use client';

import {
  CalendarDays,
  Droplet,
  Flower2,
  HeartPulse,
  Mail,
  Pencil,
  Phone,
  Plus,
  Settings,
  Shield,
  User,
  UserRoundPlus,
} from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import type { PatientProfile } from '@/features/patient/api/types';
import { useCountriesList } from '@/features/reference/hooks/use-countries-list';
import { useInsuranceProvidersList } from '@/features/reference/hooks/use-insurance-providers-list';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import { Icon } from '@/shared/icons/icon';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';

function initialsFor(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

function ageFrom(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const hadBirthdayThisYear =
    now.getMonth() > dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}

export interface PatientProfileViewProps {
  profile: PatientProfile;
  /** Every edit affordance below (Edit, Add Contact, Add Insurance) routes here — the patient profile has a single combined edit surface (`PatientProfileForm` + `PersonalInfoStep`), not per-card editors. */
  onEdit: () => void;
}

/**
 * The read-only rendering of a patient's profile — Personal Info, Emergency
 * Contacts, Insurance, and Settings as tabs, mirroring the reference
 * dashboard-card layout. Used both as the default "View" mode and as the
 * read-only mode for a viewer without edit access.
 */
export function PatientProfileView({ profile, onEdit }: PatientProfileViewProps) {
  const t = useTranslations('patient.profile');
  const format = useFormatter();
  const { data: countries } = useCountriesList();
  const { data: insuranceProviders } = useInsuranceProvidersList();

  const nationalityName = countries?.find((country) => country.id === profile.nationalityId)?.name;
  const insuranceProviderName = insuranceProviders?.find(
    (provider) => provider.id === profile.insuranceProviderId,
  )?.name;
  const age = profile.dateOfBirth ? ageFrom(profile.dateOfBirth) : undefined;

  const personalInfoCard = (
    <Card>
      <CardHeader className="flex-row items-center justify-between px-7 py-6">
        <CardTitle>{t('personalInformation')}</CardTitle>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Icon icon={Pencil} size="sm" className="me-2" />
          {t('edit')}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 px-7 pt-0 pb-7">
        <div className="flex items-center gap-3">
          <Avatar className="size-14 text-base">
            <AvatarFallback>{initialsFor(profile.fullName)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-0.5">
            <p className="text-base font-semibold text-text-primary">{profile.fullName}</p>
            <p className="text-sm text-text-secondary">
              {profile.gender ? t(`genderOptions.${profile.gender}`) : t('notOnRecord')}
              {age !== undefined && ` · ${t('ageYearsOld', { age })}`}
            </p>
            <div className="flex flex-col gap-0.5 text-sm text-text-secondary">
              <div className="flex items-center gap-2">
                <Icon icon={Mail} size="sm" />
                {profile.email}
              </div>
              <div className="flex items-center gap-2">
                <Icon icon={Phone} size="sm" />
                {profile.phoneNumber ?? t('notOnRecord')}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
              <Icon icon={CalendarDays} size="xs" />
              {t('dateOfBirth')}
            </div>
            <p className="text-sm font-medium text-text-primary">
              {profile.dateOfBirth
                ? format.dateTime(new Date(profile.dateOfBirth), {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : t('notOnRecord')}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
              <Icon icon={Droplet} size="xs" />
              {t('bloodType')}
            </div>
            <p className="text-sm font-medium text-text-primary">
              {profile.bloodType ?? t('notOnRecord')}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
              <Icon icon={Flower2} size="xs" />
              {t('allergies')}
            </div>
            <p className="text-sm font-medium text-text-primary">
              {profile.allergies || t('noAllergiesOnRecord')}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
              <Icon icon={HeartPulse} size="xs" />
              {t('chronicConditions')}
            </div>
            <p className="text-sm font-medium text-text-primary">
              {profile.chronicDiseases || t('noConditionsOnRecord')}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1 border-t border-border-default pt-4 text-sm sm:flex-row sm:gap-8">
          <div>
            <p className="text-xs text-text-tertiary">{t('nationality')}</p>
            <p className="text-text-secondary">{nationalityName ?? t('notOnRecord')}</p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary">{t('address')}</p>
            <p className="text-text-secondary">{profile.address ?? t('notOnRecord')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const emergencyContactsCard = (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-row items-center justify-between px-7 py-6">
        <CardTitle>{t('emergencyContacts')}</CardTitle>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Icon icon={Plus} size="sm" className="me-2" />
          {t('addContact')}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col px-7 pt-0 pb-7">
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
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border-default p-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary-subtle text-primary">
              <Icon icon={UserRoundPlus} size="lg" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-text-primary">
                {t('emergencyContactsEmptyTitle')}
              </p>
              <p className="max-w-56 text-sm text-text-secondary">
                {t('emergencyContactsEmptyDescription')}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const insuranceCard = (
    <Card className="flex h-full flex-col">
      <CardContent className="flex h-full flex-col gap-3 px-7 py-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary-subtle text-primary">
              <Icon icon={Shield} size="sm" />
            </div>
            <CardTitle className="text-base">{t('insurance')}</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Icon icon={Plus} size="sm" className="me-2" />
            {t('addInsurance')}
          </Button>
        </div>
        {insuranceProviderName ? (
          <p className="text-sm font-medium text-text-primary">{insuranceProviderName}</p>
        ) : (
          <div>
            <p className="text-base font-semibold text-text-primary">{t('insuranceSelfPay')}</p>
            <p className="text-sm text-text-secondary">{t('insuranceEmptyBody')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const settingsCard = (
    <Card className="flex h-full flex-col">
      <CardContent className="flex h-full flex-col gap-3 px-7 py-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary-subtle text-primary">
              <Icon icon={Settings} size="sm" />
            </div>
            <CardTitle className="text-base">{t('settings')}</CardTitle>
          </div>
          <Button variant="outline" size="sm" disabled>
            {t('learnMore')}
          </Button>
        </div>
        <div>
          <p className="text-base font-semibold text-text-primary">
            {t('settingsComingSoonTitle')}
          </p>
          <p className="text-sm text-text-secondary">{t('settingsComingSoonDescription')}</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Tabs defaultValue="personal">
      <TabsList className="w-auto overflow-x-auto p-1.5">
        <TabsTrigger
          value="personal"
          className="whitespace-nowrap flex items-center px-4 py-3 data-[state=active]:text-primary"
        >
          <Icon icon={User} size="sm" className="me-2" />
          {t('tabs.personalInfo')}
        </TabsTrigger>
        <TabsTrigger
          value="emergency"
          className="whitespace-nowrap flex items-center px-4 py-3 data-[state=active]:text-primary"
        >
          <Icon icon={Phone} size="sm" className="me-2" />
          {t('tabs.emergencyContacts')}
        </TabsTrigger>
        <TabsTrigger
          value="insurance"
          className="whitespace-nowrap flex items-center px-4 py-3 data-[state=active]:text-primary"
        >
          <Icon icon={Shield} size="sm" className="me-2" />
          {t('tabs.insurance')}
        </TabsTrigger>
        <TabsTrigger
          value="settings"
          className="whitespace-nowrap flex items-center px-4 py-3 data-[state=active]:text-primary"
        >
          <Icon icon={Settings} size="sm" className="me-2" />
          {t('tabs.settings')}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="personal" className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[68fr_32fr]">
          {personalInfoCard}
          {emergencyContactsCard}
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {insuranceCard}
          {settingsCard}
        </div>
        <div className="flex flex-col items-start justify-between gap-3 rounded-lg bg-primary-subtle p-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-primary">
              <Icon icon={Shield} size="sm" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">{t('privacyTitle')}</p>
              <p className="text-sm text-text-secondary">{t('privacyDescription')}</p>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="emergency">{emergencyContactsCard}</TabsContent>
      <TabsContent value="insurance">{insuranceCard}</TabsContent>
      <TabsContent value="settings">{settingsCard}</TabsContent>
    </Tabs>
  );
}
