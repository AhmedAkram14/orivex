'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, CircleAlert } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useId, type ReactNode } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import type { DoctorProfile } from '@/features/doctor/api/types';
import {
  DepartmentCombobox,
  FeeInput,
  HospitalCombobox,
  InsuranceTokens,
  LanguageChips,
  SpecialtyCombobox,
  WorkExperienceEditor,
  YearsStepper,
} from '@/features/doctor/components/profile-fields';
import { PROFESSIONAL_RANKS } from '@/features/doctor/components/onboarding/work-experience-dialog';
import { useRegisterDoctorProfile } from '@/features/doctor/hooks/use-register-doctor-profile';
import { useUpdateDoctorProfile } from '@/features/doctor/hooks/use-update-doctor-profile';
import { createOnboardingProfileSchema, type OnboardingProfileFormValues } from '@/features/doctor/schemas/onboarding.schema';
import { ApiError } from '@/shared/lib/api/client';
import { cn } from '@/shared/lib/cn';
import { cairoYear } from '@/shared/lib/date/iso-date';
import { Icon } from '@/shared/icons/icon';
import { ActionBar } from '@/shared/ui/action-bar';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { FormChoice, FormDateField } from '@/shared/ui/form-controls';
import { Input } from '@/shared/ui/input';
import { LockedField } from '@/shared/ui/locked-field';
import { Textarea } from '@/shared/ui/textarea';

const MAX_WORK_EXPERIENCE_ENTRIES = 10;
const BIOGRAPHY_MAX = 500;

export interface ProfileStepProps {
  /** Undefined the first time through (no DoctorProfile exists yet) -- the step registers instead of updates. */
  profile: DoctorProfile | undefined;
  onSaved: (profile: DoctorProfile) => void;
  onBack?: () => void;
  submitLabel: string;
}

const errorIcon = <Icon icon={CircleAlert} size="xs" className="mt-px shrink-0" />;

/** A titled sub-card grouping related fields. */
function Group({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-5 rounded-(--r-card) border border-border-default bg-surface p-5 sm:p-6">
      <h2 id={id} className="text-small font-semibold text-text-secondary">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Doctor Onboarding (Phase 4 continuation; redesigned Onboarding Redesign
 * 2026-07-21 proposal, Stage O.6): the wizard's Professional Info step --
 * creates the profile via the real `POST /doctors` the first time through
 * (a still-Patient applicant), or updates it via the existing
 * `PATCH /doctors/me` on every later pass (editing before submission, or
 * after a rejection) -- never a second profile. Onboarding Redesign Stage O.9: `specialtyId` is the
 * sole source of a doctor's specialty.
 *
 * Grouped into License, Practice and About you as a doctor, with work experience as a list edited in a dialog --
 * the controls are the shared `profile-fields` the doctor's Profile editor uses too. Same fields, schema and body as
 * before (dates `YYYY-MM-DD`, languages and insurance as arrays, the fee and years through the same coercion).
 */
export function ProfileStep({ profile, onSaved, onBack, submitLabel }: ProfileStepProps) {
  const t = useTranslations('doctor.onboarding.profileStep');
  const format = useFormatter();
  const tValidation = useTranslations('doctor.onboarding.profileStep.validation');
  const tRanks = useTranslations('doctor.onboarding.profileStep.professionalRanks');
  const registerProfile = useRegisterDoctorProfile();
  const updateProfile = useUpdateDoctorProfile();
  const isEditing = Boolean(profile);
  const mutation = isEditing ? updateProfile : registerProfile;
  const ids = { expiry: useId(), rank: useId(), languages: useId() };
  const thisYear = cairoYear();

  const form = useForm<OnboardingProfileFormValues>({
    mode: 'onTouched',
    resolver: zodResolver(createOnboardingProfileSchema(tValidation)),
    defaultValues: {
      licenseNumber: profile?.licenseNumber ?? '',
      specialtyId: profile?.specialtyId ?? '',
      biography: profile?.biography,
      yearsOfExperience: profile?.yearsOfExperience,
      languages: profile?.languages ?? [],
      insuranceProviders: profile?.insuranceProviders ?? [],
      consultationFeeAmount: profile?.consultationFeeAmount,
      hospitalId: profile?.hospitalId,
      professionalRank: profile?.professionalRank,
      licenseExpiryDate: profile?.licenseExpiryDate?.slice(0, 10) ?? '',
      departmentId: profile?.departmentId,
      workExperience:
        profile?.workExperience?.map((entry) => ({
          organizationName: entry.organizationName,
          position: entry.position,
          professionalRank: entry.professionalRank,
          startDate: entry.startDate.slice(0, 10),
          endDate: entry.endDate?.slice(0, 10),
          description: entry.description,
        })) ?? [],
    },
  });

  const selectedHospitalId = useWatch({ control: form.control, name: 'hospitalId' });
  const biography = useWatch({ control: form.control, name: 'biography' }) ?? '';
  const workExperience = useFieldArray({ control: form.control, name: 'workExperience' });

  async function onSubmit(values: OnboardingProfileFormValues) {
    try {
      // licenseNumber is locked (not removed) on the edit pass -- it's
      // still present in react-hook-form's values, but PATCH /doctors/me's
      // real DTO never accepts it (only registration sets it, once), and
      // the global ValidationPipe's forbidNonWhitelisted rejects any extra
      // field outright. Strip it here rather than loosening the backend
      // contract for a field that's genuinely immutable after registration.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude it from updateValues
      const { licenseNumber: _licenseNumber, ...updateValues } = values;
      const saved = isEditing ? await updateProfile.mutateAsync(updateValues) : await registerProfile.mutateAsync(values);
      onSaved(saved);
    } catch {
      // Inline error rendered below from mutation.error.
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {mutation.error instanceof ApiError && (
          <Alert variant="danger" role="alert">
            {mutation.error.message}
          </Alert>
        )}

        <Group title={t('groups.license')}>
          <div className="grid gap-5 sm:grid-cols-2">
            {isEditing ? (
              <LockedField label={t('licenseNumber')} value={profile?.licenseNumber ?? ''} help={t('licenseNumberLocked')} ltr />
            ) : (
              <FormField
                control={form.control}
                name="licenseNumber"
                render={({ field }) => (
                  <FormItem className="gap-2">
                    <FormLabel className="font-semibold">{t('licenseNumber')}</FormLabel>
                    <FormControl>
                      <Input {...field} dir="ltr" autoComplete="off" className="rtl:text-right" />
                    </FormControl>
                    <FormMessage icon={errorIcon} />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="licenseExpiryDate"
              render={({ field }) => (
                <FormItem className="gap-2">
                  <FormLabel id={ids.expiry} className="font-semibold">
                    {t('licenseExpiryDate')}
                  </FormLabel>
                  <FormDateField field={field} labelId={ids.expiry} fromYear={thisYear - 10} toYear={thisYear + 30} />
                  <FormMessage icon={errorIcon} />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="professionalRank"
            render={({ field }) => (
              <FormItem className="gap-2">
                <FormLabel id={ids.rank} className="font-semibold">
                  {t('professionalRank')}
                </FormLabel>
                <FormChoice
                  field={field}
                  labelId={ids.rank}
                  options={PROFESSIONAL_RANKS.map((rank) => ({ value: rank, label: tRanks(rank) }))}
                  // Five options, some long in Arabic: two columns on a phone, one row from sm.
                  className="grid grid-cols-2 rounded-xl sm:grid-cols-5"
                  itemClassName="h-auto min-h-9 rounded-lg px-2 py-1.5 leading-tight whitespace-normal"
                />
                <FormMessage icon={errorIcon} />
              </FormItem>
            )}
          />
        </Group>

        <Group title={t('groups.practice')}>
          <FormField
            control={form.control}
            name="specialtyId"
            render={({ field }) => (
              <FormItem className="gap-2">
                <FormLabel className="font-semibold">{t('specialty')}</FormLabel>
                <SpecialtyCombobox field={field} />
                <FormMessage icon={errorIcon} />
              </FormItem>
            )}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="yearsOfExperience"
              render={({ field }) => (
                <FormItem className="gap-2">
                  <FormLabel className="font-semibold">{t('experience')}</FormLabel>
                  <YearsStepper field={field} />
                  <FormMessage icon={errorIcon} />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="consultationFeeAmount"
              render={({ field }) => (
                <FormItem className="gap-2">
                  <FormLabel className="font-semibold">{t('consultationFee')}</FormLabel>
                  <FeeInput field={field} />
                  <FormDescription className="text-small text-text-tertiary">{t('consultationFeeHelp')}</FormDescription>
                  <FormMessage icon={errorIcon} />
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="hospitalId"
              render={({ field }) => (
                <FormItem className="gap-2">
                  <FormLabel className="font-semibold">{t('hospital')}</FormLabel>
                  <HospitalCombobox field={field} onIndependent={() => form.setValue('departmentId', undefined)} />
                  <FormMessage icon={errorIcon} />
                </FormItem>
              )}
            />
            {selectedHospitalId && (
              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem className="gap-2">
                    <FormLabel className="font-semibold">{t('department')}</FormLabel>
                    <DepartmentCombobox field={field} hospitalId={selectedHospitalId} />
                    <FormMessage icon={errorIcon} />
                  </FormItem>
                )}
              />
            )}
          </div>
        </Group>

        <Group title={t('groups.aboutYou')}>
          <FormField
            control={form.control}
            name="biography"
            render={({ field }) => (
              <FormItem className="gap-2">
                <FormLabel className="font-semibold">{t('biography')}</FormLabel>
                <FormControl>
                  <Textarea {...field} value={field.value ?? ''} rows={4} dir="auto" maxLength={BIOGRAPHY_MAX + 50} />
                </FormControl>
                <div className="flex items-start justify-between gap-3">
                  <FormDescription className="text-small text-text-tertiary">{t('biographyHelp')}</FormDescription>
                  <span
                    className={cn('shrink-0 text-caption tabular-nums', biography.length > BIOGRAPHY_MAX ? 'text-danger' : 'text-text-tertiary')}
                    aria-live="polite"
                  >
                    {format.number(biography.length)}/{format.number(BIOGRAPHY_MAX)}
                  </span>
                </div>
                <FormMessage icon={errorIcon} />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="languages"
            render={({ field }) => (
              <FormItem className="gap-2">
                <FormLabel id={ids.languages} className="font-semibold">
                  {t('languages')}
                </FormLabel>
                <LanguageChips field={field} labelId={ids.languages} />
                <FormMessage icon={errorIcon} />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="insuranceProviders"
            render={({ field }) => (
              <FormItem className="gap-2">
                <FormLabel className="font-semibold">{t('insuranceProviders')}</FormLabel>
                <InsuranceTokens field={field} placeholder={t('insuranceProvidersPlaceholder')} />
                <FormDescription className="text-small text-text-tertiary">{t('insuranceProvidersHelp')}</FormDescription>
                <FormMessage icon={errorIcon} />
              </FormItem>
            )}
          />
        </Group>

        <Group title={t('workExperience')}>
          <WorkExperienceEditor
            entries={workExperience.fields}
            max={MAX_WORK_EXPERIENCE_ENTRIES}
            onAdd={workExperience.append}
            onUpdate={workExperience.update}
            onRemove={workExperience.remove}
          />
        </Group>

        <ActionBar
          start={
            onBack ? (
              <Button type="button" variant="secondary" onClick={onBack}>
                <Icon icon={ArrowLeft} size="sm" flipRtl />
                {t('back')}
              </Button>
            ) : undefined
          }
          end={
            <Button type="submit" loading={mutation.isPending}>
              {submitLabel}
              <Icon icon={ArrowRight} size="sm" flipRtl />
            </Button>
          }
        />
      </form>
    </Form>
  );
}
