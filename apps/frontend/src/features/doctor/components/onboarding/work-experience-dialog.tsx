'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import {
  createWorkExperienceEntrySchema,
  type WorkExperienceEntryValues,
} from '@/features/doctor/schemas/onboarding.schema';
import { Icon } from '@/shared/icons/icon';
import { cairoYear } from '@/shared/lib/date/iso-date';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { DateField } from '@/shared/ui/date-field';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { NativeSelect } from '@/shared/ui/native-select';
import { Textarea } from '@/shared/ui/textarea';

export const PROFESSIONAL_RANKS = [
  'resident',
  'registrar',
  'specialist',
  'consultant',
  'professor',
] as const;

export interface WorkExperienceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The entry being edited, or undefined to add one. */
  entry: WorkExperienceEntryValues | undefined;
  onSave: (entry: WorkExperienceEntryValues) => void;
}

const errorIcon = <Icon icon={CircleAlert} size="xs" className="mt-px shrink-0" />;

function MonthYear({
  value,
  onChange,
  onBlur,
  inputRef,
  labelId,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
  onBlur: () => void;
  inputRef: React.Ref<HTMLSelectElement>;
  labelId: string;
}) {
  const { error, formItemId, formMessageId } = useFormField();
  const year = cairoYear();
  return (
    <DateField
      granularity="month"
      id={formItemId}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      firstRef={inputRef}
      labelledBy={labelId}
      fromYear={year - 70}
      toYear={year}
      invalid={!!error}
      describedBy={error ? formMessageId : undefined}
    />
  );
}

/**
 * Add or edit one work-experience entry in a dialog (a bottom sheet on a phone) instead of an inline card. Start and
 * end are month + year (stored as the 1st of the month, the same `YYYY-MM-DD` shape the API takes); "I currently
 * work here" starts unchecked and, while checked, hides the end date and sends none -- exactly as before.
 */
export function WorkExperienceDialog({
  open,
  onOpenChange,
  entry,
  onSave,
}: WorkExperienceDialogProps) {
  const t = useTranslations('doctor.onboarding.profileStep');
  const tValidation = useTranslations('doctor.onboarding.profileStep.validation');
  const tRanks = useTranslations('doctor.onboarding.profileStep.professionalRanks');
  const startLabelId = useId();
  const endLabelId = useId();

  const schema = createWorkExperienceEntrySchema(tValidation)
    .and(z.object({ current: z.boolean() }))
    .superRefine((value, ctx) => {
      if (!value.current && !value.endDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endDate'],
          message: tValidation('workExperienceEndDateRequired'),
        });
      }
    });
  type DialogValues = z.infer<typeof schema>;

  const empty: DialogValues = {
    organizationName: '',
    position: '',
    professionalRank: undefined,
    startDate: '',
    endDate: undefined,
    description: '',
    current: false,
  };
  const form = useForm<DialogValues>({
    mode: 'onTouched',
    resolver: zodResolver(schema),
    defaultValues: empty,
  });
  const current = useWatch({ control: form.control, name: 'current' });

  useEffect(() => {
    if (!open) return;
    form.reset(
      entry
        ? { ...entry, description: entry.description ?? '', current: entry.endDate === undefined }
        : empty,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens for an entry
  }, [open, entry]);

  function submit({ current: isCurrent, ...values }: DialogValues) {
    onSave({
      ...values,
      endDate: isCurrent ? undefined : values.endDate,
      description: values.description || undefined,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{entry ? t('editWorkExperience') : t('addWorkExperience')}</DialogTitle>
          <DialogDescription>{t('workExperienceDialogDescription')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(event) => {
              event.stopPropagation();
              void form.handleSubmit(submit)(event);
            }}
            className="flex flex-col gap-4"
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="organizationName"
                render={({ field }) => (
                  <FormItem className="gap-2">
                    <FormLabel className="font-semibold">
                      {t('workExperienceOrganization')}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} dir="auto" />
                    </FormControl>
                    <FormMessage icon={errorIcon} />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem className="gap-2">
                    <FormLabel className="font-semibold">{t('workExperiencePosition')}</FormLabel>
                    <FormControl>
                      <Input {...field} dir="auto" />
                    </FormControl>
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
                  <FormLabel className="font-semibold">{t('workExperienceRank')}</FormLabel>
                  <FormControl>
                    <NativeSelect
                      ref={field.ref}
                      name={field.name}
                      value={field.value ?? ''}
                      onChange={(event) => field.onChange(event.target.value || undefined)}
                      onBlur={field.onBlur}
                    >
                      <option value="">{t('workExperienceRankPlaceholder')}</option>
                      {PROFESSIONAL_RANKS.map((rank) => (
                        <option key={rank} value={rank} className="text-text-primary">
                          {tRanks(rank)}
                        </option>
                      ))}
                    </NativeSelect>
                  </FormControl>
                  <FormMessage icon={errorIcon} />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="gap-2">
                  <FormLabel id={startLabelId} className="font-semibold">
                    {t('workExperienceStartDate')}
                  </FormLabel>
                  <MonthYear
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    inputRef={field.ref}
                    labelId={startLabelId}
                  />
                  <FormMessage icon={errorIcon} />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="current"
              render={({ field }) => (
                <FormItem className="flex-row items-center gap-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                  </FormControl>
                  <FormLabel className="font-normal text-text-secondary">
                    {t('workExperienceCurrentlyWorkHere')}
                  </FormLabel>
                </FormItem>
              )}
            />
            {!current && (
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="gap-2">
                    <FormLabel id={endLabelId} className="font-semibold">
                      {t('workExperienceEndDate')}
                    </FormLabel>
                    <MonthYear
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      inputRef={field.ref}
                      labelId={endLabelId}
                    />
                    <FormMessage icon={errorIcon} />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="gap-2">
                  <FormLabel className="font-semibold">{t('workExperienceDescription')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ''} rows={3} dir="auto" />
                  </FormControl>
                  <FormMessage icon={errorIcon} />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit">{t('saveWorkExperience')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
