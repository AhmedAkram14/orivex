'use client';

import {
  CalendarDays,
  Droplet,
  Flower2,
  Globe2,
  HeartPulse,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Settings,
  Shield,
  User,
  UserRoundPlus,
  type LucideIcon,
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
import { cn } from '@/shared/lib/cn';

// Shared "premium card" language this page borrows from the redesigned "My
// Health" dashboard (same radius + soft elevated shadow), so the profile
// and dashboard read as one product.
const CARD_CLASSNAME = 'rounded-2xl border-border-default/60 shadow-[0_10px_30px_rgba(15,23,42,0.05)]';

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

interface InfoTileProps {
  icon: LucideIcon;
  iconClassName: string;
  label: string;
  value: string;
}

/** One "at a glance" medical fact — a distinctly colored icon (so the four tiles read apart instead of blending into one another) over a label/value pair. */
function InfoTile({ icon, iconClassName, label, value }: InfoTileProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border-default/70 bg-surface p-3">
      <div className={cn('flex size-8 items-center justify-center rounded-lg', iconClassName)}>
        <Icon icon={icon} size="sm" />
      </div>
      <div>
        <p className="text-xs text-text-tertiary">{label}</p>
        <p className="text-sm font-medium text-text-primary">{value}</p>
      </div>
    </div>
  );
}

export interface PatientProfileViewProps {
  profile: PatientProfile;
  /** Every edit affordance below (Edit, Add Contact, Add Insurance) routes here — the patient profile has a single combined edit surface (`PatientProfileForm` + `PersonalInfoStep`), not per-card editors. */
  onEdit: () => void;
}

/**
 * The read-only rendering of a patient's profile — Personal Info, Emergency
 * Contacts, Insurance, and Settings as tabs. Used both as the default
 * "View" mode and as the read-only mode for a viewer without edit access.
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
    <Card className={cn('relative isolate overflow-hidden bg-gradient-to-br from-primary-subtle/40 to-surface', CARD_CLASSNAME)}>
      <div aria-hidden className="pointer-events-none absolute -end-14 -top-16 size-48 rounded-full bg-primary/10 blur-3xl" />

      <CardHeader className="relative z-10 flex-row items-center justify-between px-7 py-6">
        <CardTitle>{t('personalInformation')}</CardTitle>
        <Button variant="outline" size="sm" onClick={onEdit} className="bg-surface/80">
          <Icon icon={Pencil} size="sm" className="me-2" />
          {t('edit')}
        </Button>
      </CardHeader>
      <CardContent className="relative z-10 flex flex-col gap-5 px-7 pt-0 pb-7">
        <div className="flex items-center gap-3.5">
          <Avatar className="size-14 shrink-0 text-base ring-4 ring-surface/80">
            <AvatarFallback className="bg-primary text-primary-foreground">{initialsFor(profile.fullName)}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-base font-semibold text-text-primary">{profile.fullName}</p>
            <p className="text-sm text-text-secondary">
              {profile.gender ? t(`genderOptions.${profile.gender}`) : t('notOnRecord')}
              {age !== undefined && ` · ${t('ageYearsOld', { age })}`}
            </p>
            <div className="flex flex-col gap-0.5 text-sm text-text-secondary">
              <div className="flex items-center gap-2">
                <Icon icon={Mail} size="sm" className="shrink-0" />
                <span className="min-w-0 wrap-break-word">{profile.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon icon={Phone} size="sm" className="shrink-0" />
                {profile.phoneNumber ?? t('notOnRecord')}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <InfoTile
            icon={CalendarDays}
            iconClassName="bg-primary-subtle text-primary"
            label={t('dateOfBirth')}
            value={
              profile.dateOfBirth
                ? format.dateTime(new Date(profile.dateOfBirth), { year: 'numeric', month: 'short', day: 'numeric' })
                : t('notOnRecord')
            }
          />
          <InfoTile
            icon={Droplet}
            iconClassName="bg-danger-subtle text-danger"
            label={t('bloodType')}
            value={profile.bloodType ?? t('notOnRecord')}
          />
          <InfoTile
            icon={Flower2}
            iconClassName="bg-warning-subtle text-warning"
            label={t('allergies')}
            value={profile.allergies || t('noAllergiesOnRecord')}
          />
          <InfoTile
            icon={HeartPulse}
            iconClassName="bg-neutral-subtle text-neutral"
            label={t('chronicConditions')}
            value={profile.chronicDiseases || t('noConditionsOnRecord')}
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-border-default pt-4 text-sm sm:flex-row sm:gap-8">
          <div className="flex items-start gap-2">
            <Icon icon={Globe2} size="sm" className="mt-0.5 text-text-tertiary" />
            <div>
              <p className="text-xs text-text-tertiary">{t('nationality')}</p>
              <p className="text-text-secondary">{nationalityName ?? t('notOnRecord')}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Icon icon={MapPin} size="sm" className="mt-0.5 text-text-tertiary" />
            <div>
              <p className="text-xs text-text-tertiary">{t('address')}</p>
              <p className="text-text-secondary">{profile.address ?? t('notOnRecord')}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const emergencyContactsCard = (
    <Card className={cn('flex h-full flex-col', CARD_CLASSNAME)}>
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
              <li key={contact.id} className="flex items-center gap-3 rounded-xl border border-border-default/70 p-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary">
                  <Icon icon={Phone} size="sm" />
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="text-sm font-medium text-text-primary">{contact.name}</p>
                  <p className="text-sm text-text-secondary">
                    {t(`relationshipOptions.${contact.relationship}`)} · {contact.phoneNumber}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border-default p-6 text-center">
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
    <Card className={cn('flex h-full flex-col', CARD_CLASSNAME)}>
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
    <Card className={cn('flex h-full flex-col', CARD_CLASSNAME)}>
      <CardContent className="flex h-full flex-col gap-3 px-7 py-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-neutral-subtle text-neutral">
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
      <TabsList className="max-w-full overflow-x-auto rounded-xl p-1.5">
        <TabsTrigger
          value="personal"
          className="flex items-center whitespace-nowrap rounded-lg px-4 py-3 data-[state=active]:text-primary"
        >
          <Icon icon={User} size="sm" className="me-2" />
          {t('tabs.personalInfo')}
        </TabsTrigger>
        <TabsTrigger
          value="emergency"
          className="flex items-center whitespace-nowrap rounded-lg px-4 py-3 data-[state=active]:text-primary"
        >
          <Icon icon={Phone} size="sm" className="me-2" />
          {t('tabs.emergencyContacts')}
        </TabsTrigger>
        <TabsTrigger
          value="insurance"
          className="flex items-center whitespace-nowrap rounded-lg px-4 py-3 data-[state=active]:text-primary"
        >
          <Icon icon={Shield} size="sm" className="me-2" />
          {t('tabs.insurance')}
        </TabsTrigger>
        <TabsTrigger
          value="settings"
          className="flex items-center whitespace-nowrap rounded-lg px-4 py-3 data-[state=active]:text-primary"
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
        <div className="relative isolate flex flex-col items-start justify-between gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-primary-subtle to-surface p-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-primary shadow-sm">
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
