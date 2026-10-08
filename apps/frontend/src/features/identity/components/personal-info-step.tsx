'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, CircleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import type { Account } from '@/features/identity/api/types';
import { useUpdatePersonalProfile } from '@/features/identity/hooks/use-update-personal-profile';
import { createPersonalInfoSchema, type PersonalInfoFormValues } from '@/features/identity/schemas/personal-info.schema';
import { useCountriesList } from '@/features/reference/hooks/use-countries-list';
import { Icon } from '@/shared/icons/icon';
import { ApiError } from '@/shared/lib/api/client';
import { cairoYear } from '@/shared/lib/date/iso-date';
import { env } from '@/shared/lib/env';
import { ActionBar } from '@/shared/ui/action-bar';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { DateField } from '@/shared/ui/date-field';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFormField } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { LockedField } from '@/shared/ui/locked-field';
import { NativeSelect } from '@/shared/ui/native-select';
import { SegmentedControl } from '@/shared/ui/segmented-control';

export interface PersonalInfoStepProps {
  account: Account | undefined;
  onSaved: (account: Account) => void;
  /**
   * `bar` (a multi-step flow): the sticky action bar, Back (when `onBack` is given) at the inline start and
   * `submitLabel` at the inline end. `button` (default, e.g. the profile page): one submit button.
   */
  actions?: 'bar' | 'button';
  onBack?: () => void;
  submitLabel?: string;
  /** Shown above the fields (a step's title and purpose). */
  intro?: ReactNode;
}

const GENDERS = ['male', 'female', 'other'] as const;
const errorIcon = <Icon icon={CircleAlert} size="xs" className="mt-px shrink-0" />;

function DateOfBirth({ value, onChange, onBlur, inputRef, labelId }: { value: string; onChange: (value: string) => void; onBlur: () => void; inputRef: React.Ref<HTMLSelectElement>; labelId: string }) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
  const year = cairoYear();
  return (
    <DateField
      id={formItemId}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      firstRef={inputRef}
      labelledBy={labelId}
      fromYear={year - 120}
      toYear={year}
      invalid={!!error}
      describedBy={error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId}
    />
  );
}

function Gender({ value, onChange, onBlur, focusRef, labelId }: { value: PersonalInfoFormValues['gender'] | undefined; onChange: (value: PersonalInfoFormValues['gender']) => void; onBlur: () => void; focusRef: React.Ref<HTMLButtonElement>; labelId: string }) {
  const t = useTranslations('identity.personalInfoStep');
  const { error, formDescriptionId, formMessageId } = useFormField();
  return (
    <SegmentedControl
      mode="radio"
      fullWidth
      ariaLabelledBy={labelId}
      options={GENDERS.map((gender) => ({ value: gender, label: t(`genderOptions.${gender}`) }))}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      focusRef={focusRef}
      invalid={!!error}
      describedBy={error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId}
    />
  );
}

/**
 * Onboarding Redesign (2026-07-21 proposal, §0a/§2/Stage O.6): the shared
 * Personal Info step -- ONE component and ONE endpoint (PATCH /accounts/me)
 * reused verbatim by the Doctor Onboarding wizard's leading step and by the
 * Patient Profile editor, never two separate implementations. Full name is
 * Account-owned and set once at registration (`DisplayName`, no update
 * endpoint exists) -- shown locked, never a fabricated editable field the
 * backend can't actually save.
 *
 * Body unchanged: `{ dateOfBirth: 'YYYY-MM-DD', gender, nationalityId, address }`. Date of birth and gender come
 * pre-filled from the account when it already has them (a patient who did the intake), and say so.
 */
export function PersonalInfoStep({ account, onSaved, actions = 'button', onBack, submitLabel, intro }: PersonalInfoStepProps) {
  const t = useTranslations('identity.personalInfoStep');
  const tValidation = useTranslations('identity.personalInfoStep.validation');
  const { data: countries, isLoading: countriesLoading } = useCountriesList();
  const updatePersonalProfile = useUpdatePersonalProfile();
  const dateLabelId = useId();
  const genderLabelId = useId();
  // What the account already had when this step opened -- the honest basis for "pre-filled".
  const [prefilled] = useState(() => ({ dateOfBirth: Boolean(account?.dateOfBirth), gender: Boolean(account?.gender) }));

  const form = useForm<PersonalInfoFormValues>({
    // Validate on blur (then on change), never before the field has been touched.
    mode: 'onTouched',
    resolver: zodResolver(createPersonalInfoSchema(tValidation)),
    defaultValues: {
      dateOfBirth: account?.dateOfBirth?.slice(0, 10) ?? '',
      gender: account?.gender,
      nationalityId: account?.nationalityId ?? '',
      address: account?.address ?? '',
    },
  });

  // One nationality on offer: shown as a fact, not a one-option dropdown -- and filled in.
  const onlyCountry = countries?.length === 1 ? countries[0] : undefined;
  useEffect(() => {
    if (onlyCountry && !form.getValues('nationalityId')) form.setValue('nationalityId', onlyCountry.id);
  }, [onlyCountry, form]);

  async function onSubmit(values: PersonalInfoFormValues) {
    try {
      const saved = await updatePersonalProfile.mutateAsync(values);
      onSaved(saved);
    } catch {
      // Inline error rendered below from mutation.error.
    }
  }

  const label = submitLabel ?? t('saveAndContinue');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        {intro}
        {updatePersonalProfile.error instanceof ApiError && (
          <Alert variant="danger" role="alert">
            {updatePersonalProfile.error.message}
          </Alert>
        )}

        <LockedField
          label={t('fullName')}
          value={account?.displayName ?? ''}
          help={t.rich('fullNameHelp', {
            support: (chunks) => (
              <a href={`mailto:${env.supportEmail}`} className="font-medium text-text-primary underline underline-offset-2">
                {chunks}
              </a>
            ),
          })}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem className="gap-2">
                <FormLabel id={dateLabelId} className="font-semibold">
                  {t('dateOfBirth')}
                </FormLabel>
                <DateOfBirth value={field.value} onChange={field.onChange} onBlur={field.onBlur} inputRef={field.ref} labelId={dateLabelId} />
                {prefilled.dateOfBirth && <FormDescription className="text-small text-text-tertiary">{t('prefilled')}</FormDescription>}
                <FormMessage icon={errorIcon} />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem className="gap-2">
                <FormLabel id={genderLabelId} className="font-semibold">
                  {t('gender')}
                </FormLabel>
                <Gender value={field.value} onChange={field.onChange} onBlur={field.onBlur} focusRef={field.ref} labelId={genderLabelId} />
                {prefilled.gender && <FormDescription className="text-small text-text-tertiary">{t('prefilled')}</FormDescription>}
                <FormMessage icon={errorIcon} />
              </FormItem>
            )}
          />
        </div>

        {onlyCountry ? (
          <LockedField label={t('nationality')} value={onlyCountry.name} help={t('nationalityOnlyOption')} />
        ) : (
          <FormField
            control={form.control}
            name="nationalityId"
            render={({ field }) => (
              <FormItem className="gap-2">
                <FormLabel className="font-semibold">{t('nationality')}</FormLabel>
                <FormControl>
                  <NativeSelect
                    ref={field.ref}
                    name={field.name}
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={countriesLoading}
                  >
                    <option value="">{t('nationalityPlaceholder')}</option>
                    {(countries ?? []).map((country) => (
                      <option key={country.id} value={country.id} className="text-text-primary">
                        {country.name}
                      </option>
                    ))}
                  </NativeSelect>
                </FormControl>
                <FormMessage icon={errorIcon} />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem className="gap-2">
              <FormLabel className="font-semibold">{t('address')}</FormLabel>
              <FormControl>
                <Input {...field} autoComplete="street-address" placeholder={t('addressPlaceholder')} />
              </FormControl>
              <FormMessage icon={errorIcon} />
            </FormItem>
          )}
        />

        {actions === 'bar' ? (
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
              <Button type="submit" loading={updatePersonalProfile.isPending}>
                {label}
                <Icon icon={ArrowRight} size="sm" flipRtl />
              </Button>
            }
          />
        ) : (
          <Button type="submit" loading={updatePersonalProfile.isPending} className="self-start">
            {label}
          </Button>
        )}
      </form>
    </Form>
  );
}
