'use client';

import type { ControllerRenderProps, FieldPath, FieldValues } from 'react-hook-form';
import { DateField, type DateFieldGranularity } from '@/shared/ui/date-field';
import { useFormField } from '@/shared/ui/form';
import { SegmentedControl, type SegmentedOption } from '@/shared/ui/segmented-control';

function useFieldAria() {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
  return {
    invalid: !!error,
    id: formItemId,
    describedBy: error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId,
  };
}

export interface FormDateFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> {
  field: ControllerRenderProps<TFieldValues, TName>;
  /** id of the FormLabel naming the date (give the label this id). */
  labelId: string;
  fromYear: number;
  toYear: number;
  granularity?: DateFieldGranularity;
}

/** `DateField` wired to the surrounding FormField/FormItem (ids, error, describedby, touched, focus). */
export function FormDateField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({ field, labelId, fromYear, toYear, granularity }: FormDateFieldProps<TFieldValues, TName>) {
  const aria = useFieldAria();
  return (
    <DateField
      id={aria.id}
      value={(field.value as string | undefined) ?? ''}
      onChange={field.onChange}
      onBlur={field.onBlur}
      firstRef={field.ref}
      labelledBy={labelId}
      fromYear={fromYear}
      toYear={toYear}
      granularity={granularity}
      invalid={aria.invalid}
      describedBy={aria.describedBy}
    />
  );
}

export interface FormChoiceProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  T extends string,
> {
  field: ControllerRenderProps<TFieldValues, TName>;
  labelId: string;
  options: readonly SegmentedOption<T>[];
  /** Stretch the options across the width (default true). */
  fullWidth?: boolean;
  className?: string;
  itemClassName?: string;
}

/** A short single choice (2-5 options) as a radio-mode segmented control, wired to the surrounding FormField. */
export function FormChoice<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  T extends string,
>({
  field,
  labelId,
  options,
  fullWidth = true,
  className,
  itemClassName,
}: FormChoiceProps<TFieldValues, TName, T>) {
  const aria = useFieldAria();
  return (
    <SegmentedControl
      mode="radio"
      fullWidth={fullWidth}
      ariaLabelledBy={labelId}
      options={options}
      value={field.value as T | undefined}
      onChange={field.onChange}
      onBlur={field.onBlur}
      focusRef={field.ref}
      invalid={aria.invalid}
      describedBy={aria.describedBy}
      className={className}
      itemClassName={itemClassName}
    />
  );
}
