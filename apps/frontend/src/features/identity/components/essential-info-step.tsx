'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, type ReactNode, type Ref } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { Account } from '@/features/identity/api/types';
import { useUpdatePersonalProfile } from '@/features/identity/hooks/use-update-personal-profile';
import { createEssentialInfoSchema, type EssentialInfoFormValues } from '@/features/identity/schemas/personal-info.schema';
import { Icon } from '@/shared/icons/icon';
import { ApiError } from '@/shared/lib/api/client';
import { cn } from '@/shared/lib/cn';
import { cairoYear } from '@/shared/lib/date/iso-date';
import { env } from '@/shared/lib/env';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFormField } from '@/shared/ui/form';
import { DateField, isCompleteDate } from '@/shared/ui/date-field';
import { LockedField } from '@/shared/ui/locked-field';
import { SegmentedControl } from '@/shared/ui/segmented-control';

export interface EssentialInfoStepProps {
  account: Account | undefined;
  onSaved: (account: Account) => void;
  /** A line shown under the submit button on a phone, where the button is pinned to the bottom of the screen. */
  footnote?: ReactNode;
}

const GENDERS = ['male', 'female', 'other'] as const;
const LABEL = 'font-semibold';
const HELP = 'text-small text-text-tertiary';
const errorIcon = <Icon icon={CircleAlert} size="xs" className="mt-px shrink-0" />;

// ---- Date of birth: the shared DateField (Day / Month / Year), giving the same `YYYY-MM-DD` the date input produced.

function DateOfBirthControl({
  value,
  onChange,
  onBlur,
  dayRef,
  labelId,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  dayRef: Ref<HTMLSelectElement>;
  labelId: string;
}) {
  const { error, formItemId, formMessageId } = useFormField();
  const year = cairoYear();
  return (
    <DateField
      id={formItemId}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      firstRef={dayRef}
      labelledBy={labelId}
      fromYear={year - 120}
      toYear={year}
      invalid={!!error}
      describedBy={error ? formMessageId : undefined}
    />
  );
}

// ---- Gender: a radio-mode segmented control (same values, order and labels as the old dropdown).

function GenderControl({
  value,
  onChange,
  onBlur,
  focusRef,
  labelId,
}: {
  value: EssentialInfoFormValues['gender'] | undefined;
  onChange: (value: EssentialInfoFormValues['gender']) => void;
  onBlur: () => void;
  focusRef: Ref<HTMLButtonElement>;
  labelId: string;
}) {
  const t = useTranslations('identity.personalInfoStep');
  const { error, formMessageId } = useFormField();
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
      describedBy={error ? formMessageId : undefined}
    />
  );
}

// ---- Phone: a fixed +20 prefix and the local number, masked `1XX XXX XXXX`; sent as `+20 1XX XXX XXXX`.

function groupLocal(digits: string): string {
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 10)].filter(Boolean).join(' ');
}

/** The local part of a stored number: `+20 100 000 0000`, `0020…`, `+20100…` and `0100…` all read as `100 000 0000`. */
function localOf(value: string | undefined): string {
  let digits = (value ?? '').replace(/\D/g, '');
  if (/^(\+|00)20/.test((value ?? '').trim())) digits = digits.replace(/^(00)?20/, '');
  return groupLocal(digits.replace(/^0/, '').slice(0, 10));
}

function EgyptFlag() {
  return (
    <svg viewBox="0 0 18 12" aria-hidden="true" focusable="false" className="h-3 w-4.5 shrink-0 overflow-hidden rounded-[2px]">
      <rect width="18" height="4" fill="#CE1126" />
      <rect y="4" width="18" height="4" fill="#FFFFFF" />
      <rect y="8" width="18" height="4" fill="#000000" />
      <circle cx="9" cy="6" r="1.2" fill="#C09300" />
    </svg>
  );
}

// ---- The step

/**
 * The patient intake's single step: only what booking truly needs (date of birth, gender, phone -- the name is set
 * at registration and no endpoint edits it). Same endpoint, hook and body as before (PATCH /accounts/me with
 * `{ dateOfBirth: 'YYYY-MM-DD', gender, phoneNumber }`); nationality and address are optional and live on the profile.
 */
export function EssentialInfoStep({ account, onSaved, footnote }: EssentialInfoStepProps) {
  const t = useTranslations('identity.personalInfoStep');
  const tValidation = useTranslations('identity.personalInfoStep.validation');
  const updatePersonalProfile = useUpdatePersonalProfile();
  const dateLabelId = useId();
  const genderLabelId = useId();
  const countryId = useId();

  const form = useForm<EssentialInfoFormValues>({
    mode: 'onTouched',
    resolver: zodResolver(createEssentialInfoSchema(tValidation)),
    defaultValues: {
      dateOfBirth: account?.dateOfBirth?.slice(0, 10) ?? '',
      gender: account?.gender,
      phoneNumber: account?.phoneNumber ?? '',
    },
  });
  const [dateOfBirth, gender, phoneNumber] = useWatch({ control: form.control, name: ['dateOfBirth', 'gender', 'phoneNumber'] });
  const allFilled = isCompleteDate(dateOfBirth) && Boolean(gender) && Boolean(phoneNumber?.trim());

  async function onSubmit(values: EssentialInfoFormValues) {
    try {
      onSaved(await updatePersonalProfile.mutateAsync(values));
    } catch {
      // Inline error rendered below from mutation.error.
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-5" noValidate>
        {updatePersonalProfile.error instanceof ApiError && (
          <Alert variant="danger" role="alert">
            {updatePersonalProfile.error.message}
          </Alert>
        )}

        {/* Full name: account-owned, set at registration; read-only here and everywhere else in the app. */}
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

        <FormField
          control={form.control}
          name="dateOfBirth"
          render={({ field }) => (
            <FormItem className="gap-2">
              <FormLabel id={dateLabelId} className={LABEL}>
                {t('dateOfBirth')}
              </FormLabel>
              <DateOfBirthControl value={field.value} onChange={field.onChange} onBlur={field.onBlur} dayRef={field.ref} labelId={dateLabelId} />
              <FormMessage icon={errorIcon} />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem className="gap-2">
              <FormLabel id={genderLabelId} className={LABEL}>
                {t('gender')}
              </FormLabel>
              <GenderControl value={field.value} onChange={field.onChange} onBlur={field.onBlur} focusRef={field.ref} labelId={genderLabelId} />
              <FormMessage icon={errorIcon} />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem className="gap-2">
              <FormLabel className={LABEL}>{t('phone')}</FormLabel>
              <div
                className={cn(
                  'flex h-10 items-stretch overflow-hidden rounded-md border border-border-default bg-surface',
                  'focus-within:ring-2 focus-within:ring-focus-ring focus-within:ring-offset-2',
                  'has-aria-invalid:border-danger has-aria-invalid:focus-within:ring-danger',
                )}
              >
                <span className="flex shrink-0 items-center gap-1.5 border-e border-border-default bg-surface-2 px-3 text-sm text-text-secondary">
                  <EgyptFlag />
                  <bdi dir="ltr">+20</bdi>
                  <span id={countryId} className="sr-only">
                    {t('phoneCountry')}
                  </span>
                </span>
                <FormControl>
                  <input
                    ref={field.ref}
                    name={field.name}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    dir="ltr"
                    placeholder="100 000 0000"
                    value={localOf(field.value)}
                    onChange={(event) => {
                      const digits = event.target.value.replace(/\D/g, '').replace(/^0/, '').slice(0, 10);
                      field.onChange(digits ? `+20 ${groupLocal(digits)}` : '');
                    }}
                    onBlur={field.onBlur}
                    className="min-w-0 flex-1 bg-transparent px-3 text-sm text-text-primary tabular-nums placeholder:text-text-tertiary focus:outline-none rtl:text-right"
                  />
                </FormControl>
              </div>
              <FormDescription className={HELP}>{t('phoneHelp')}</FormDescription>
              <FormMessage icon={errorIcon} />
            </FormItem>
          )}
        />

        {/* The button stays on screen: pinned to the bottom on a phone, and on short desktop windows (under 800px tall)
            where the card is taller than the viewport, flush with the card's bottom edge. */}
        <div
          className={cn(
            'mt-auto flex flex-col gap-3 pt-1',
            'max-sm:sticky max-sm:bottom-0 max-sm:-mx-4 max-sm:border-t max-sm:border-border-default max-sm:bg-surface max-sm:px-4 max-sm:pt-3 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]',
            '[@media(min-width:40rem)_and_(max-height:50rem)]:sticky [@media(min-width:40rem)_and_(max-height:50rem)]:bottom-0 [@media(min-width:40rem)_and_(max-height:50rem)]:-mx-8 [@media(min-width:40rem)_and_(max-height:50rem)]:-mb-8 [@media(min-width:40rem)_and_(max-height:50rem)]:rounded-b-(--r-card) [@media(min-width:40rem)_and_(max-height:50rem)]:border-t [@media(min-width:40rem)_and_(max-height:50rem)]:border-border-default [@media(min-width:40rem)_and_(max-height:50rem)]:bg-surface [@media(min-width:40rem)_and_(max-height:50rem)]:px-8 [@media(min-width:40rem)_and_(max-height:50rem)]:py-4',
          )}
        >
          <Button type="submit" size="lg" className="w-full" disabled={!allFilled} loading={updatePersonalProfile.isPending}>
            {t('saveAndContinue')}
          </Button>
          {footnote && <div className="sm:hidden">{footnote}</div>}
        </div>
      </form>
    </Form>
  );
}
