'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Briefcase, CircleAlert, Minus, Pencil, Plus, Trash2 } from 'lucide-react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useId, useState, type ReactNode } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import type { DoctorProfile } from '@/features/doctor/api/types';
import { useDepartmentsList } from '@/features/doctor/hooks/use-departments-list';
import { useHospitalsList } from '@/features/doctor/hooks/use-hospitals-list';
import { useRegisterDoctorProfile } from '@/features/doctor/hooks/use-register-doctor-profile';
import { useUpdateDoctorProfile } from '@/features/doctor/hooks/use-update-doctor-profile';
import { PROFESSIONAL_RANKS, WorkExperienceDialog } from '@/features/doctor/components/onboarding/work-experience-dialog';
import {
  createOnboardingProfileSchema,
  type OnboardingProfileFormValues,
  type WorkExperienceEntryValues,
} from '@/features/doctor/schemas/onboarding.schema';
import { useInsuranceProvidersList } from '@/features/reference/hooks/use-insurance-providers-list';
import { useSpecialtiesList } from '@/features/reference/hooks/use-specialties-list';
import { ApiError } from '@/shared/lib/api/client';
import { cn } from '@/shared/lib/cn';
import { cairoYear } from '@/shared/lib/date/iso-date';
import { getSpecialtyStyle, SPECIALTY_HUE_CLASSES } from '@/shared/lib/specialty-palette';
import { pickLocalizedName } from '@/shared/i18n/localized-name';
import { Icon } from '@/shared/icons/icon';
import { ActionBar } from '@/shared/ui/action-bar';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { CheckboxChips } from '@/shared/ui/checkbox-chips';
import { Combobox } from '@/shared/ui/combobox';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { DateField } from '@/shared/ui/date-field';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFormField } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { LockedField } from '@/shared/ui/locked-field';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import { TagInput } from '@/shared/ui/tag-input';
import { Textarea } from '@/shared/ui/textarea';

const MAX_WORK_EXPERIENCE_ENTRIES = 10;
const BIOGRAPHY_MAX = 500;
// Arabic first for an Egyptian audience (display order only: the array keeps the order languages were ticked in).
const SUPPORTED_LANGUAGES = ['ar', 'en'] as const;
// "Independent Practice" isn't a hospital row: this sentinel maps to `hospitalId: undefined` (as before).
const INDEPENDENT_PRACTICE_VALUE = '__independent_practice__';

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

/** Reads the current FormField's ids for controls that wire their own aria-*. */
function useFieldAria() {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
  return { invalid: !!error, id: formItemId, describedBy: error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId };
}

function LicenseExpiry({ value, onChange, onBlur, inputRef, labelId }: { value: string; onChange: (value: string) => void; onBlur: () => void; inputRef: React.Ref<HTMLSelectElement>; labelId: string }) {
  const aria = useFieldAria();
  const year = cairoYear();
  return (
    <DateField id={aria.id} value={value} onChange={onChange} onBlur={onBlur} firstRef={inputRef} labelledBy={labelId} fromYear={year - 10} toYear={year + 30} invalid={aria.invalid} describedBy={aria.describedBy} />
  );
}

function Rank({ value, onChange, onBlur, focusRef, labelId }: { value: OnboardingProfileFormValues['professionalRank'] | undefined; onChange: (value: OnboardingProfileFormValues['professionalRank']) => void; onBlur: () => void; focusRef: React.Ref<HTMLButtonElement>; labelId: string }) {
  const tRanks = useTranslations('doctor.onboarding.profileStep.professionalRanks');
  const aria = useFieldAria();
  return (
    <SegmentedControl
      mode="radio"
      fullWidth
      // Five options, some long in Arabic: two columns on a phone, one row from sm.
      className="grid grid-cols-2 rounded-xl sm:grid-cols-5"
      itemClassName="h-auto min-h-9 rounded-lg px-2 py-1.5 leading-tight whitespace-normal"
      ariaLabelledBy={labelId}
      options={PROFESSIONAL_RANKS.map((rank) => ({ value: rank, label: tRanks(rank) }))}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      focusRef={focusRef}
      invalid={aria.invalid}
      describedBy={aria.describedBy}
    />
  );
}

function FieldCombobox(props: Omit<React.ComponentProps<typeof Combobox>, 'id' | 'invalid' | 'describedBy'>) {
  const aria = useFieldAria();
  return <Combobox {...props} id={aria.id} invalid={aria.invalid} describedBy={aria.describedBy} />;
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
 * Grouped into License, Practice and About you as a doctor, with work experience as a list edited in a dialog.
 * Same fields, schema and body as before (dates `YYYY-MM-DD`, languages and insurance as arrays, the fee and years
 * through the same coercion).
 */
export function ProfileStep({ profile, onSaved, onBack, submitLabel }: ProfileStepProps) {
  const t = useTranslations('doctor.onboarding.profileStep');
  const locale = useLocale();
  const format = useFormatter();
  const tValidation = useTranslations('doctor.onboarding.profileStep.validation');
  const tLanguages = useTranslations('doctor.profile.languageNames');
  const tRanks = useTranslations('doctor.onboarding.profileStep.professionalRanks');
  const { data: hospitals, isLoading: hospitalsLoading } = useHospitalsList();
  const { data: specialties, isLoading: specialtiesLoading } = useSpecialtiesList();
  const { data: insuranceProviders } = useInsuranceProvidersList();
  const registerProfile = useRegisterDoctorProfile();
  const updateProfile = useUpdateDoctorProfile();
  const isEditing = Boolean(profile);
  const mutation = isEditing ? updateProfile : registerProfile;
  const ids = { expiry: useId(), rank: useId(), languages: useId(), insurance: useId(), suggestions: useId() };
  const [dialog, setDialog] = useState<{ open: boolean; index: number | undefined }>({ open: false, index: undefined });
  const [removing, setRemoving] = useState<number | undefined>(undefined);

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
        profile?.workExperience.map((entry) => ({
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
  const { data: departments, isLoading: departmentsLoading } = useDepartmentsList(selectedHospitalId);
  const workExperience = useFieldArray({ control: form.control, name: 'workExperience' });

  // Hospitals, deduplicated by id, with "Independent practice" once at the top (a hospital row that happens to
  // carry the same name is the same thing to an applicant, so it isn't listed a second time).
  const independentLabel = t('independentPractice');
  const normalize = (value: string) => value.trim().toLocaleLowerCase();
  const seen = new Set<string>();
  const hospitalOptions = [
    { value: INDEPENDENT_PRACTICE_VALUE, label: independentLabel },
    ...(hospitals ?? [])
      .filter((hospital) => {
        if (seen.has(hospital.id)) return false;
        seen.add(hospital.id);
        return normalize(hospital.name) !== normalize(independentLabel) && normalize(hospital.name) !== 'independent practice';
      })
      .map((hospital) => ({ value: hospital.id, label: hospital.name })),
  ];

  const specialtyOptions = (specialties ?? []).map((specialty) => {
    const style = getSpecialtyStyle(specialty.name);
    const hue = SPECIALTY_HUE_CLASSES[style.hue];
    return {
      value: specialty.id,
      label: pickLocalizedName(specialty.name, specialty.nameAr, locale),
      keywords: [specialty.name, specialty.nameAr ?? ''],
      leading: (
        <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-full', hue.tile, hue.glyph)}>
          <Icon icon={style.icon} size="xs" />
        </span>
      ),
    };
  });

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

  const editingEntry = dialog.index !== undefined ? form.getValues(`workExperience.${dialog.index}`) : undefined;
  const yearOf = (date: string | undefined) => (date ? format.number(Number(date.slice(0, 4)), { useGrouping: false }) : '');

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
                  <LicenseExpiry value={field.value} onChange={field.onChange} onBlur={field.onBlur} inputRef={field.ref} labelId={ids.expiry} />
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
                <Rank value={field.value} onChange={field.onChange} onBlur={field.onBlur} focusRef={field.ref} labelId={ids.rank} />
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
                <FieldCombobox
                  options={specialtyOptions}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  triggerRef={field.ref}
                  disabled={specialtiesLoading}
                  placeholder={t('specialtyPlaceholder')}
                  searchPlaceholder={t('specialtySearch')}
                  emptyText={t('noMatches')}
                />
                <FormMessage icon={errorIcon} />
              </FormItem>
            )}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="yearsOfExperience"
              render={({ field }) => {
                const years = field.value === undefined || (field.value as unknown) === '' ? undefined : Number(field.value);
                const set = (next: number) => field.onChange(String(Math.min(80, Math.max(0, next))));
                return (
                  <FormItem className="gap-2">
                    <FormLabel className="font-semibold">{t('experience')}</FormLabel>
                    <div className="flex h-10 items-stretch overflow-hidden rounded-md border border-border-default bg-surface focus-within:ring-2 focus-within:ring-focus-ring focus-within:ring-offset-2 has-aria-invalid:border-danger">
                      <button type="button" aria-label={t('experienceDecrease')} onClick={() => set((years ?? 0) - 1)} className="flex w-10 shrink-0 items-center justify-center border-e border-border-default text-text-secondary hover:bg-surface-2">
                        <Icon icon={Minus} size="sm" />
                      </button>
                      <FormControl>
                        <input
                          ref={field.ref}
                          name={field.name}
                          inputMode="numeric"
                          value={field.value === undefined ? '' : String(field.value)}
                          onChange={(event) => field.onChange(event.target.value.replace(/\D/g, '').slice(0, 2))}
                          onBlur={field.onBlur}
                          className="w-full min-w-0 bg-transparent px-2 text-center text-sm tabular-nums text-text-primary outline-none"
                        />
                      </FormControl>
                      <span className="flex shrink-0 items-center pe-3 text-small text-text-tertiary">{t('yearsSuffix')}</span>
                      <button type="button" aria-label={t('experienceIncrease')} onClick={() => set((years ?? 0) + 1)} className="flex w-10 shrink-0 items-center justify-center border-s border-border-default text-text-secondary hover:bg-surface-2">
                        <Icon icon={Plus} size="sm" />
                      </button>
                    </div>
                    <FormMessage icon={errorIcon} />
                  </FormItem>
                );
              }}
            />
            <FormField
              control={form.control}
              name="consultationFeeAmount"
              render={({ field }) => (
                <FormItem className="gap-2">
                  <FormLabel className="font-semibold">{t('consultationFee')}</FormLabel>
                  <div className="flex h-10 items-stretch overflow-hidden rounded-md border border-border-default bg-surface focus-within:ring-2 focus-within:ring-focus-ring focus-within:ring-offset-2 has-aria-invalid:border-danger">
                    <span className="flex shrink-0 items-center border-e border-border-default bg-surface-2 px-3 text-sm font-medium text-text-secondary">
                      <bdi dir="ltr">EGP</bdi>
                    </span>
                    <FormControl>
                      <input
                        ref={field.ref}
                        name={field.name}
                        inputMode="decimal"
                        dir="ltr"
                        value={field.value === undefined ? '' : String(field.value)}
                        onChange={(event) => field.onChange(event.target.value.replace(/[^0-9.]/g, ''))}
                        onBlur={field.onBlur}
                        className="w-full min-w-0 bg-transparent px-3 text-sm tabular-nums text-text-primary outline-none placeholder:text-text-tertiary rtl:text-right"
                      />
                    </FormControl>
                  </div>
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
                  <FieldCombobox
                    options={hospitalOptions}
                    value={field.value ?? INDEPENDENT_PRACTICE_VALUE}
                    onChange={(value) => {
                      const nextHospitalId = value === INDEPENDENT_PRACTICE_VALUE ? undefined : value;
                      field.onChange(nextHospitalId);
                      if (!nextHospitalId) form.setValue('departmentId', undefined);
                    }}
                    onBlur={field.onBlur}
                    triggerRef={field.ref}
                    disabled={hospitalsLoading}
                    placeholder={t('hospitalPlaceholder')}
                    searchPlaceholder={t('hospitalSearch')}
                    emptyText={t('noMatches')}
                  />
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
                    <FieldCombobox
                      options={(departments ?? []).map((department) => ({ value: department.id, label: department.name }))}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      triggerRef={field.ref}
                      disabled={departmentsLoading}
                      placeholder={t('departmentPlaceholder')}
                      searchPlaceholder={t('departmentSearch')}
                      emptyText={t('noMatches')}
                    />
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
                  <span className={cn('shrink-0 text-caption tabular-nums', biography.length > BIOGRAPHY_MAX ? 'text-danger' : 'text-text-tertiary')} aria-live="polite">
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
                <LanguagesControl value={field.value ?? []} onChange={field.onChange} onBlur={field.onBlur} firstRef={field.ref} labelId={ids.languages} options={SUPPORTED_LANGUAGES.map((language) => ({ value: language, label: tLanguages(language) }))} />
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
                <FormControl>
                  <TagInput
                    ref={field.ref}
                    value={(field.value ?? []).join(', ')}
                    onValueChange={(joined) =>
                      field.onChange(
                        joined
                          .split(',')
                          .map((provider) => provider.trim())
                          .filter(Boolean),
                      )
                    }
                    onBlur={field.onBlur}
                    placeholder={t('insuranceProvidersPlaceholder')}
                    list={ids.suggestions}
                  />
                </FormControl>
                <datalist id={ids.suggestions}>
                  {(insuranceProviders ?? [])
                    .filter((provider) => provider.isActive)
                    .map((provider) => (
                      <option key={provider.id} value={provider.name} />
                    ))}
                </datalist>
                <FormDescription className="text-small text-text-tertiary">{t('insuranceProvidersHelp')}</FormDescription>
                <FormMessage icon={errorIcon} />
              </FormItem>
            )}
          />
        </Group>

        <Group title={t('workExperience')}>
          {workExperience.fields.length === 0 ? (
            <p className="text-sm text-text-secondary">{t('workExperienceEmpty')}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border-default">
              {workExperience.fields.map((entry, index) => (
                <li key={entry.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-text-secondary">
                    <Icon icon={Briefcase} size="sm" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="truncate text-sm font-semibold text-text-primary">
                      <bdi>{entry.position}</bdi>
                      {entry.professionalRank && <span className="font-normal text-text-secondary"> · {tRanks(entry.professionalRank)}</span>}
                    </p>
                    <p className="truncate text-small text-text-secondary">
                      <bdi>{entry.organizationName}</bdi> · {yearOf(entry.startDate)}–{entry.endDate ? yearOf(entry.endDate) : t('present')}
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" aria-label={t('editWorkExperienceFor', { name: entry.organizationName })} onClick={() => setDialog({ open: true, index })}>
                    <Icon icon={Pencil} size="sm" />
                    <span className="max-sm:sr-only">{t('edit')}</span>
                  </Button>
                  <Button type="button" variant="ghost" size="sm" aria-label={t('removeWorkExperienceFor', { name: entry.organizationName })} onClick={() => setRemoving(index)}>
                    <Icon icon={Trash2} size="sm" />
                    <span className="max-sm:sr-only">{t('remove')}</span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {workExperience.fields.length < MAX_WORK_EXPERIENCE_ENTRIES && (
            <Button type="button" variant="secondary" size="sm" className="self-start" onClick={() => setDialog({ open: true, index: undefined })}>
              <Icon icon={Plus} size="sm" />
              {t('addWorkExperience')}
            </Button>
          )}
        </Group>

        <WorkExperienceDialog
          open={dialog.open}
          onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
          entry={editingEntry as WorkExperienceEntryValues | undefined}
          onSave={(entry) => {
            if (dialog.index === undefined) workExperience.append(entry);
            else workExperience.update(dialog.index, entry);
          }}
        />
        <ConfirmDialog
          open={removing !== undefined}
          onOpenChange={(open) => !open && setRemoving(undefined)}
          title={t('removeWorkExperienceTitle')}
          description={t('removeWorkExperienceDescription')}
          confirmLabel={t('remove')}
          cancelLabel={t('cancel')}
          tone="danger"
          onConfirm={() => {
            if (removing !== undefined) workExperience.remove(removing);
            setRemoving(undefined);
          }}
        />

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

function LanguagesControl({ value, onChange, onBlur, firstRef, labelId, options }: { value: string[]; onChange: (value: string[]) => void; onBlur: () => void; firstRef: React.Ref<HTMLInputElement>; labelId: string; options: { value: string; label: string }[] }) {
  const aria = useFieldAria();
  return <CheckboxChips options={options} value={value} onChange={onChange} onBlur={onBlur} firstRef={firstRef} labelledBy={labelId} invalid={aria.invalid} describedBy={aria.describedBy} />;
}
