'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, CircleAlert, Lock } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useId, useState, type FocusEvent, type ReactNode, type Ref } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { Account } from '@/features/identity/api/types';
import { useUpdatePersonalProfile } from '@/features/identity/hooks/use-update-personal-profile';
import { createEssentialInfoSchema, type EssentialInfoFormValues } from '@/features/identity/schemas/personal-info.schema';
import { Icon } from '@/shared/icons/icon';
import { ApiError } from '@/shared/lib/api/client';
import { cn } from '@/shared/lib/cn';
import { env } from '@/shared/lib/env';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFormField } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
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
// Shared with `Input`: a native select drawn like the text fields (same height, border, focus ring and error state).
const SELECT =
  'h-10 w-full appearance-none rounded-md border border-border-default bg-surface ps-3 pe-8 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:ring-danger';

// ---- Date of birth: Day / Month / Year, composed into the same `YYYY-MM-DD` string the date input produced.

interface DateParts {
  day: string;
  month: string;
  year: string;
}

function partsOf(value: string | undefined): DateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  if (!match) return { day: '', month: '', year: '' };
  return { year: match[1] === '0000' ? '' : match[1]!, month: match[2] === '00' ? '' : match[2]!, day: match[3] === '00' ? '' : match[3]! };
}

/** All three chosen -> `YYYY-MM-DD`; none -> ''; some -> a partial string the schema rejects as "Enter a real date". */
function composeDate({ day, month, year }: DateParts): string {
  if (!day && !month && !year) return '';
  return `${year || '0000'}-${month || '00'}-${day || '00'}`;
}

function isCompleteDate(value: string | undefined): boolean {
  const parts = partsOf(value);
  return Boolean(parts.day && parts.month && parts.year);
}

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
  const t = useTranslations('identity.personalInfoStep');
  const format = useFormatter();
  const { error, formItemId, formMessageId } = useFormField();
  const [parts, setParts] = useState<DateParts>(() => partsOf(value));
  const thisYear = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric' }).format(new Date()));
  const describedBy = error ? formMessageId : undefined;

  function update(next: Partial<DateParts>) {
    const merged = { ...parts, ...next };
    setParts(merged);
    onChange(composeDate(merged));
  }

  // "Touched" once focus leaves all three selects, not when it moves between them.
  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onBlur();
  }

  const segment = (
    key: keyof DateParts,
    options: { value: string; label: string }[],
    ref?: Ref<HTMLSelectElement>,
    id?: string,
  ) => (
    <div className="relative min-w-0">
      <select
        ref={ref}
        id={id}
        aria-label={t(key)}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        value={parts[key]}
        onChange={(event) => update({ [key]: event.target.value })}
        className={cn(SELECT, !parts[key] && 'text-text-tertiary')}
      >
        <option value="">{t(key)}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value} className="text-text-primary">
            {option.label}
          </option>
        ))}
      </select>
      <Icon icon={ChevronDown} size="sm" className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
    </div>
  );

  return (
    <div role="group" aria-labelledby={labelId} onBlur={handleBlur} className="grid grid-cols-[1fr_1.35fr_1.2fr] gap-2">
      {segment(
        'day',
        Array.from({ length: 31 }, (_, index) => ({ value: String(index + 1).padStart(2, '0'), label: format.number(index + 1) })),
        dayRef,
        formItemId,
      )}
      {segment(
        'month',
        Array.from({ length: 12 }, (_, index) => ({
          value: String(index + 1).padStart(2, '0'),
          label: format.dateTime(new Date(Date.UTC(2000, index, 1)), { month: 'short', timeZone: 'UTC' }),
        })),
      )}
      {segment(
        'year',
        // Newest first; 120 years back covers everyone (the app and the API set no age bound).
        Array.from({ length: 121 }, (_, index) => ({ value: String(thisYear - index), label: format.number(thisYear - index, { useGrouping: false }) })),
      )}
    </div>
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
  const nameId = useId();
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
        <div className="flex flex-col gap-2">
          <label htmlFor={nameId} className="text-sm font-semibold text-text-primary">
            {t('fullName')}
          </label>
          <div className="relative">
            <Input
              id={nameId}
              readOnly
              value={account?.displayName ?? ''}
              aria-describedby={`${nameId}-help`}
              className="cursor-default border-border-default bg-surface-2 pe-9 text-text-secondary"
            />
            <Icon icon={Lock} size="sm" className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          </div>
          <p id={`${nameId}-help`} className={HELP}>
            {t.rich('fullNameHelp', {
              support: (chunks) => (
                <a href={`mailto:${env.supportEmail}`} className="font-medium text-text-primary underline underline-offset-2">
                  {chunks}
                </a>
              ),
            })}
          </p>
        </div>

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
