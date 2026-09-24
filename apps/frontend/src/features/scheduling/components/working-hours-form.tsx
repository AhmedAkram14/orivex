'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useFieldArray, useForm, useWatch, type Control } from 'react-hook-form';
import { useEffect } from 'react';
import { PricingTypeRadioGroup } from '@/features/scheduling/components/pricing-type-radio-group';
import { useUpdateDoctorAvailability } from '@/features/scheduling/hooks/use-update-doctor-availability';
import { createWorkingHoursSchema, type WorkingHoursFormValues } from '@/features/scheduling/schemas/working-hours.schema';
import type { RecurringWeeklySchedule } from '@/features/scheduling/types';
import { ApiError } from '@/shared/lib/api/client';
import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';
import { Icon } from '@/shared/icons/icon';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Switch } from '@/shared/ui/switch';

export interface WorkingHoursFormProps {
  schedule: RecurringWeeklySchedule;
  onSaved: () => void;
  /** Closes the editor without saving -- gated by the same unsaved-changes confirm as the dialog's own "×"/overlay/Escape close. */
  onCancel: () => void;
  /** Lets the parent dialog/sheet gate its own "×"/overlay/Escape close behind the same unsaved-changes confirm this form uses for its Cancel button. */
  onDirtyChange?: (isDirty: boolean) => void;
}

/** One day's breaks — a nested `useFieldArray` scoped to `days.${dayIndex}.breaks`, since RHF field arrays only track one array level each. */
function DayBreaks({ control, dayIndex }: { control: Control<WorkingHoursFormValues>; dayIndex: number }) {
  const t = useTranslations('scheduling.availability');
  const breaks = useFieldArray({ control, name: `days.${dayIndex}.breaks` });

  return (
    <div className="flex flex-col gap-2 border-t border-border-default pt-3">
      {/* A visible, distinct sub-heading -- previously these rows sat directly
          under the pricing controls with nothing but a trash icon to tell
          them apart. Each row also gets its own visible "Break N" text label
          (not just an `aria-label`) so sighted users get the same context a
          screen reader already had. */}
      <p className="text-xs font-medium text-text-tertiary">{t('breaksHeading')}</p>
      {breaks.fields.map((breakField, breakIndex) => (
        <div key={breakField.id} className="flex items-center gap-2">
          <span className="w-16 shrink-0 text-xs font-medium text-text-secondary">
            {t('breakRowLabel', { number: breakIndex + 1 })}
          </span>
          <FormField
            control={control}
            name={`days.${dayIndex}.breaks.${breakIndex}.start`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input type="time" aria-label={t('breakStartLabel', { number: breakIndex + 1 })} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <span className="text-text-tertiary" aria-hidden="true">
            –
          </span>
          <FormField
            control={control}
            name={`days.${dayIndex}.breaks.${breakIndex}.end`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input type="time" aria-label={t('breakEndLabel', { number: breakIndex + 1 })} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('removeBreak')}
            onClick={() => breaks.remove(breakIndex)}
          >
            <Icon icon={Trash2} size="sm" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => breaks.append({ start: '13:00', end: '14:00' })}>
        <Icon icon={Plus} size="sm" className="me-2" />
        {t('addBreak')}
      </Button>
    </div>
  );
}

/**
 * Consultation Pricing Redesign: this weekday's default price -- every
 * `AvailabilityWindow` generated from it inherits this unless the doctor
 * later overrides one individually (Upcoming Slots). Free/Paid is a real
 * `role="radiogroup"`/`"radio"` pair (`PricingTypeRadioGroup`), not a
 * `FilterTabs` (Radix Tabs underneath -- meant for switching which content
 * panel is visible, not a two-choice value) and not a `Switch` (an on/off
 * state, not two named choices).
 */
function DayPricing({ control, dayIndex, dayOfWeek }: { control: Control<WorkingHoursFormValues>; dayIndex: number; dayOfWeek: string }) {
  const t = useTranslations('scheduling.availability');
  const tDay = useTranslations('scheduling.weekDays');
  const pricingType = useWatch({ control, name: `days.${dayIndex}.pricing.pricingType` });

  return (
    <div className="flex flex-col gap-2 border-t border-border-default pt-3">
      <p className="text-xs font-medium text-text-tertiary">{t('defaultPricingLabel')}</p>
      <FormField
        control={control}
        name={`days.${dayIndex}.pricing.pricingType`}
        render={({ field }) => (
          <PricingTypeRadioGroup
            value={field.value}
            onChange={field.onChange}
            freeLabel={t('pricingTypeFree')}
            paidLabel={t('pricingTypePaid')}
            groupLabel={t('pricingTypeLabel', { day: tDay(dayOfWeek) })}
            idPrefix={`working-hours-pricing-${dayOfWeek}`}
          />
        )}
      />
      {pricingType === 'paid' && (
        <div className="flex items-end gap-2">
          <FormField
            control={control}
            name={`days.${dayIndex}.pricing.feeAmount`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>{t('feeAmountFieldLabel')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    aria-label={t('feeAmountLabel', { day: tDay(dayOfWeek) })}
                    value={field.value ?? ''}
                    onChange={(event) => field.onChange(event.target.value === '' ? null : Number(event.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`days.${dayIndex}.pricing.feeCurrency`}
            render={({ field }) => (
              <FormItem className="w-24">
                <FormControl>
                  <Input
                    type="text"
                    maxLength={3}
                    placeholder="EGP"
                    aria-label={t('feeCurrencyLabel', { day: tDay(dayOfWeek) })}
                    value={field.value ?? ''}
                    onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  );
}

function DayRow({
  control,
  dayIndex,
  dayOfWeek,
}: {
  control: Control<WorkingHoursFormValues>;
  dayIndex: number;
  dayOfWeek: string;
}) {
  const t = useTranslations('scheduling.availability');
  const tDay = useTranslations('scheduling.weekDays');

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border-default p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-text-primary">{tDay(dayOfWeek)}</p>
        <FormField
          control={control}
          name={`days.${dayIndex}.isWorkingDay`}
          render={({ field }) => (
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
              aria-label={t('workingDayToggle', { day: tDay(dayOfWeek) })}
            />
          )}
        />
      </div>

      {useWatch({ control, name: `days.${dayIndex}.isWorkingDay` }) && (
        <>
          <div className="flex items-center gap-2">
            <FormField
              control={control}
              name={`days.${dayIndex}.hours.start`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input type="time" aria-label={t('startTimeLabel', { day: tDay(dayOfWeek) })} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <span className="text-text-tertiary" aria-hidden="true">
              –
            </span>
            <FormField
              control={control}
              name={`days.${dayIndex}.hours.end`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input type="time" aria-label={t('endTimeLabel', { day: tDay(dayOfWeek) })} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <DayPricing control={control} dayIndex={dayIndex} dayOfWeek={dayOfWeek} />
          <DayBreaks control={control} dayIndex={dayIndex} />
        </>
      )}
    </div>
  );
}

/**
 * The Doctor Availability editor — a 7-day recurring weekly template (a
 * working-day toggle, hours, and up to 5 breaks per day), backed by a real
 * (mocked) PATCH `/scheduling/doctor-availability`. This replaces Phase 7's
 * read-only Schedule Foundation display with the real editing architecture
 * its own doc comment anticipated.
 */
export function WorkingHoursForm({ schedule, onSaved, onCancel, onDirtyChange }: WorkingHoursFormProps) {
  const t = useTranslations('scheduling.availability');
  const tValidation = useTranslations('scheduling.availability.validation');
  const updateAvailability = useUpdateDoctorAvailability();

  const form = useForm<WorkingHoursFormValues>({
    resolver: zodResolver(createWorkingHoursSchema(tValidation)),
    defaultValues: { days: schedule },
  });

  const isDirty = form.formState.isDirty;
  // Real browser-level exit (tab close/refresh/typed URL) + same-document
  // link clicks -- the beforeunload/link-intercept half of the unsaved-
  // changes guard. The dialog's own "×"/overlay/Escape close and this
  // form's Cancel button are a second, distinct exit path this hook doesn't
  // cover (it has no opinion on a parent `Dialog`'s `onOpenChange`), handled
  // below via `onDirtyChange` + a `window.confirm` at each of those two
  // call sites instead.
  useUnsavedChangesGuard(isDirty, t('unsavedChangesWarning'));
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  function handleCancel() {
    if (isDirty && !window.confirm(t('unsavedChangesWarning'))) return;
    onCancel();
  }

  async function onSubmit(values: WorkingHoursFormValues) {
    try {
      // A day switched from Paid back to Free only hides its fee inputs --
      // their stale RHF values aren't cleared automatically. Normalize here
      // so the wire payload is never internally inconsistent (Free with a
      // leftover fee), matching `SlotPricingDialog`'s own submit shape.
      const days: RecurringWeeklySchedule = values.days.map((day) => ({
        ...day,
        pricing:
          day.pricing.pricingType === 'free'
            ? { pricingType: 'free', feeAmount: null, feeCurrency: null }
            // ORIVEX Egypt V1 is a single-currency market -- a doctor who
            // sets Paid pricing but leaves the currency field blank should
            // never end up with a null/empty currency on the wire; default
            // to EGP rather than rejecting the save or fabricating a
            // different currency. An explicitly-typed currency is never
            // overridden.
            : { ...day.pricing, feeCurrency: day.pricing.feeCurrency?.trim() ? day.pricing.feeCurrency : 'EGP' },
      })) as RecurringWeeklySchedule;
      await updateAvailability.mutateAsync(days);
      onSaved();
    } catch {
      // Inline error rendered below from `updateAvailability.error`.
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
        {updateAvailability.error instanceof ApiError && (
          <Alert variant="danger" role="alert">
            {updateAvailability.error.message}
          </Alert>
        )}

        <div className="flex flex-col gap-4">
          {schedule.map((day, dayIndex) => (
            <DayRow key={day.dayOfWeek} control={form.control} dayIndex={dayIndex} dayOfWeek={day.dayOfWeek} />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" loading={updateAvailability.isPending}>
            {t('save')}
          </Button>
          <Button type="button" variant="outline" onClick={handleCancel}>
            {t('cancel')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
