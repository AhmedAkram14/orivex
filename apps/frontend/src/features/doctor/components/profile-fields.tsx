'use client';

import { Briefcase, Minus, Pencil, Plus, Trash2 } from 'lucide-react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import type { ControllerRenderProps, FieldPath, FieldValues } from 'react-hook-form';
import { useDepartmentsList } from '@/features/doctor/hooks/use-departments-list';
import { useHospitalsList } from '@/features/doctor/hooks/use-hospitals-list';
import { WorkExperienceDialog } from '@/features/doctor/components/onboarding/work-experience-dialog';
import type { WorkExperienceEntryValues } from '@/features/doctor/schemas/onboarding.schema';
import { useInsuranceProvidersList } from '@/features/reference/hooks/use-insurance-providers-list';
import { useSpecialtiesList } from '@/features/reference/hooks/use-specialties-list';
import { pickLocalizedName } from '@/shared/i18n/localized-name';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';
import { getSpecialtyStyle, SPECIALTY_HUE_CLASSES } from '@/shared/lib/specialty-palette';
import { Button } from '@/shared/ui/button';
import { CheckboxChips } from '@/shared/ui/checkbox-chips';
import { Combobox } from '@/shared/ui/combobox';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { FormControl, useFormField } from '@/shared/ui/form';
import { TagInput } from '@/shared/ui/tag-input';

/**
 * The doctor-profile controls shared by the application (onboarding step 2) and the doctor's own Profile editor --
 * one implementation of each, wired to the surrounding FormField. Values are exactly what the old inputs produced.
 */

// "Independent Practice" isn't a hospital row: this sentinel maps to `hospitalId: undefined`.
const INDEPENDENT_PRACTICE_VALUE = '__independent_practice__';
// Arabic first for an Egyptian audience (display order only: the array keeps the order languages were ticked in).
export const SUPPORTED_LANGUAGES = ['ar', 'en'] as const;

type Field<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = ControllerRenderProps<TFieldValues, TName>;

function useFieldAria() {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
  return {
    invalid: !!error,
    id: formItemId,
    describedBy: error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId,
  };
}

/** Specialty: a searchable list, each with its glyph and hue. */
export function SpecialtyCombobox<V extends FieldValues, N extends FieldPath<V>>({
  field,
}: {
  field: Field<V, N>;
}) {
  const t = useTranslations('doctor.onboarding.profileStep');
  const locale = useLocale();
  const aria = useFieldAria();
  const { data: specialties, isLoading } = useSpecialtiesList();
  const options = (specialties ?? []).map((specialty) => {
    const style = getSpecialtyStyle(specialty.name);
    const hue = SPECIALTY_HUE_CLASSES[style.hue];
    return {
      value: specialty.id,
      label: pickLocalizedName(specialty.name, specialty.nameAr, locale),
      keywords: [specialty.name, specialty.nameAr ?? ''],
      leading: (
        <span
          className={cn(
            'flex size-5 shrink-0 items-center justify-center rounded-full',
            hue.tile,
            hue.glyph,
          )}
        >
          <Icon icon={style.icon} size="xs" />
        </span>
      ),
    };
  });
  return (
    <Combobox
      id={aria.id}
      invalid={aria.invalid}
      describedBy={aria.describedBy}
      options={options}
      value={field.value as string | undefined}
      onChange={field.onChange}
      onBlur={field.onBlur}
      triggerRef={field.ref}
      disabled={isLoading}
      placeholder={t('specialtyPlaceholder')}
      searchPlaceholder={t('specialtySearch')}
      emptyText={t('noMatches')}
    />
  );
}

/** Years of experience: − / + around a numeric input, with a "years" suffix (0-80; same string the old input gave). */
export function YearsStepper<V extends FieldValues, N extends FieldPath<V>>({
  field,
}: {
  field: Field<V, N>;
}) {
  const t = useTranslations('doctor.onboarding.profileStep');
  const raw = field.value as unknown;
  const years = raw === undefined || raw === '' || raw === null ? undefined : Number(raw);
  const set = (next: number) => field.onChange(String(Math.min(80, Math.max(0, next))));
  return (
    <div className="flex h-10 items-stretch overflow-hidden rounded-md border border-border-default bg-surface focus-within:ring-2 focus-within:ring-focus-ring focus-within:ring-offset-2 has-aria-invalid:border-danger">
      <button
        type="button"
        aria-label={t('experienceDecrease')}
        onClick={() => set((years ?? 0) - 1)}
        className="flex w-10 shrink-0 items-center justify-center border-e border-border-default text-text-secondary hover:bg-surface-2"
      >
        <Icon icon={Minus} size="sm" />
      </button>
      <FormControl>
        <input
          ref={field.ref}
          name={field.name}
          inputMode="numeric"
          value={raw === undefined || raw === null ? '' : String(raw)}
          onChange={(event) => field.onChange(event.target.value.replace(/\D/g, '').slice(0, 2))}
          onBlur={field.onBlur}
          className="w-full min-w-0 bg-transparent px-2 text-center text-sm tabular-nums text-text-primary outline-none"
        />
      </FormControl>
      <span className="flex shrink-0 items-center pe-3 text-small text-text-tertiary">
        {t('yearsSuffix')}
      </span>
      <button
        type="button"
        aria-label={t('experienceIncrease')}
        onClick={() => set((years ?? 0) + 1)}
        className="flex w-10 shrink-0 items-center justify-center border-s border-border-default text-text-secondary hover:bg-surface-2"
      >
        <Icon icon={Plus} size="sm" />
      </button>
    </div>
  );
}

/** Consultation fee: an EGP prefix, a decimal keypad, no spinner (same string the old number input gave). */
export function FeeInput<V extends FieldValues, N extends FieldPath<V>>({
  field,
}: {
  field: Field<V, N>;
}) {
  const raw = field.value as unknown;
  return (
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
          value={raw === undefined || raw === null ? '' : String(raw)}
          onChange={(event) => field.onChange(event.target.value.replace(/[^0-9.]/g, ''))}
          onBlur={field.onBlur}
          className="w-full min-w-0 bg-transparent px-3 text-sm tabular-nums text-text-primary outline-none rtl:text-right"
        />
      </FormControl>
    </div>
  );
}

/**
 * Hospital or clinic: deduplicated by id, with "Independent practice" once at the top (a hospital row carrying the
 * same name is the same thing to a doctor, so it isn't listed twice). Choosing it sends no hospital, as before.
 */
export function HospitalCombobox<V extends FieldValues, N extends FieldPath<V>>({
  field,
  onIndependent,
}: {
  field: Field<V, N>;
  /** Called when "Independent practice" is chosen (e.g. to clear the department). */
  onIndependent?: () => void;
}) {
  const t = useTranslations('doctor.onboarding.profileStep');
  const aria = useFieldAria();
  const { data: hospitals, isLoading } = useHospitalsList();
  const independentLabel = t('independentPractice');
  const normalize = (value: string) => value.trim().toLocaleLowerCase();
  const seen = new Set<string>();
  const options = [
    { value: INDEPENDENT_PRACTICE_VALUE, label: independentLabel },
    ...(hospitals ?? [])
      .filter((hospital) => {
        if (seen.has(hospital.id)) return false;
        seen.add(hospital.id);
        return (
          normalize(hospital.name) !== normalize(independentLabel) &&
          normalize(hospital.name) !== 'independent practice'
        );
      })
      .map((hospital) => ({ value: hospital.id, label: hospital.name })),
  ];
  return (
    <Combobox
      id={aria.id}
      invalid={aria.invalid}
      describedBy={aria.describedBy}
      options={options}
      value={(field.value as string | undefined) ?? INDEPENDENT_PRACTICE_VALUE}
      onChange={(value) => {
        const hospitalId = value === INDEPENDENT_PRACTICE_VALUE ? undefined : value;
        field.onChange(hospitalId);
        if (!hospitalId) onIndependent?.();
      }}
      onBlur={field.onBlur}
      triggerRef={field.ref}
      disabled={isLoading}
      placeholder={t('hospitalPlaceholder')}
      searchPlaceholder={t('hospitalSearch')}
      emptyText={t('noMatches')}
    />
  );
}

/** The selected hospital's departments. */
export function DepartmentCombobox<V extends FieldValues, N extends FieldPath<V>>({
  field,
  hospitalId,
}: {
  field: Field<V, N>;
  hospitalId: string;
}) {
  const t = useTranslations('doctor.onboarding.profileStep');
  const aria = useFieldAria();
  const { data: departments, isLoading } = useDepartmentsList(hospitalId);
  return (
    <Combobox
      id={aria.id}
      invalid={aria.invalid}
      describedBy={aria.describedBy}
      options={(departments ?? []).map((department) => ({
        value: department.id,
        label: department.name,
      }))}
      value={field.value as string | undefined}
      onChange={field.onChange}
      onBlur={field.onBlur}
      triggerRef={field.ref}
      disabled={isLoading}
      placeholder={t('departmentPlaceholder')}
      searchPlaceholder={t('departmentSearch')}
      emptyText={t('noMatches')}
    />
  );
}

/** Languages: checkbox chips (a multi-select that looks like one), Arabic first. */
export function LanguageChips<V extends FieldValues, N extends FieldPath<V>>({
  field,
  labelId,
}: {
  field: Field<V, N>;
  labelId: string;
}) {
  const tLanguages = useTranslations('doctor.profile.languageNames');
  const aria = useFieldAria();
  return (
    <CheckboxChips
      options={SUPPORTED_LANGUAGES.map((language) => ({
        value: language,
        label: tLanguages(language),
      }))}
      value={(field.value as string[] | undefined) ?? []}
      onChange={field.onChange}
      onBlur={field.onBlur}
      firstRef={field.ref}
      labelledBy={labelId}
      invalid={aria.invalid}
      describedBy={aria.describedBy}
    />
  );
}

/** Insurance providers: a token input (Enter or a comma adds), suggesting the real provider list. Same string array. */
export function InsuranceTokens<V extends FieldValues, N extends FieldPath<V>>({
  field,
  placeholder,
}: {
  field: Field<V, N>;
  placeholder: string;
}) {
  const suggestionsId = useId();
  const { data: providers } = useInsuranceProvidersList();
  return (
    <>
      <FormControl>
        <TagInput
          ref={field.ref}
          value={((field.value as string[] | undefined) ?? []).join(', ')}
          onValueChange={(joined) =>
            field.onChange(
              joined
                .split(',')
                .map((provider) => provider.trim())
                .filter(Boolean),
            )
          }
          onBlur={field.onBlur}
          placeholder={placeholder}
          list={suggestionsId}
        />
      </FormControl>
      <datalist id={suggestionsId}>
        {(providers ?? [])
          .filter((provider) => provider.isActive)
          .map((provider) => (
            <option key={provider.id} value={provider.name} />
          ))}
      </datalist>
    </>
  );
}

export interface WorkExperienceEditorProps {
  entries: readonly (WorkExperienceEntryValues & { id: string })[];
  max: number;
  onAdd: (entry: WorkExperienceEntryValues) => void;
  onUpdate: (index: number, entry: WorkExperienceEntryValues) => void;
  onRemove: (index: number) => void;
}

/**
 * Work experience as a compact list ("Consultant · Cairo University Hospitals · 2021–present") with Edit and Remove
 * (Remove confirmed), and "Add experience" opening the dialog (a bottom sheet on a phone).
 */
export function WorkExperienceEditor({
  entries,
  max,
  onAdd,
  onUpdate,
  onRemove,
}: WorkExperienceEditorProps) {
  const t = useTranslations('doctor.onboarding.profileStep');
  const tRanks = useTranslations('doctor.onboarding.profileStep.professionalRanks');
  const format = useFormatter();
  const [dialog, setDialog] = useState<{ open: boolean; index: number | undefined }>({
    open: false,
    index: undefined,
  });
  const [removing, setRemoving] = useState<number | undefined>(undefined);
  const yearOf = (date: string | undefined) =>
    date ? format.number(Number(date.slice(0, 4)), { useGrouping: false }) : '';
  const editing = dialog.index !== undefined ? entries[dialog.index] : undefined;

  return (
    <>
      {entries.length === 0 ? (
        <p className="text-sm text-text-secondary">{t('workExperienceEmpty')}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border-default">
          {entries.map((entry, index) => (
            <li key={entry.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-text-secondary">
                <Icon icon={Briefcase} size="sm" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate text-sm font-semibold text-text-primary">
                  <bdi>{entry.position}</bdi>
                  {entry.professionalRank && (
                    <span className="font-normal text-text-secondary">
                      {' '}
                      · {tRanks(entry.professionalRank)}
                    </span>
                  )}
                </p>
                <p className="truncate text-small text-text-secondary">
                  <bdi>{entry.organizationName}</bdi> · {yearOf(entry.startDate)}–
                  {entry.endDate ? yearOf(entry.endDate) : t('present')}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={t('editWorkExperienceFor', { name: entry.organizationName })}
                onClick={() => setDialog({ open: true, index })}
              >
                <Icon icon={Pencil} size="sm" />
                <span className="max-sm:sr-only">{t('edit')}</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={t('removeWorkExperienceFor', { name: entry.organizationName })}
                onClick={() => setRemoving(index)}
              >
                <Icon icon={Trash2} size="sm" />
                <span className="max-sm:sr-only">{t('remove')}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
      {entries.length < max && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="self-start"
          onClick={() => setDialog({ open: true, index: undefined })}
        >
          <Icon icon={Plus} size="sm" />
          {t('addWorkExperience')}
        </Button>
      )}

      <WorkExperienceDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
        entry={editing}
        onSave={(entry) =>
          dialog.index === undefined ? onAdd(entry) : onUpdate(dialog.index, entry)
        }
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
          if (removing !== undefined) onRemove(removing);
          setRemoving(undefined);
        }}
      />
    </>
  );
}
