'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { useAddDoctorException } from '@/features/scheduling/hooks/use-add-doctor-exception';
import { useRemoveDoctorException } from '@/features/scheduling/hooks/use-remove-doctor-exception';
import {
  createScheduleExceptionSchema,
  type ScheduleExceptionFormValues,
} from '@/features/scheduling/schemas/schedule-exception.schema';
import type { ScheduleException } from '@/features/scheduling/types';
import { ApiError } from '@/shared/lib/api/client';
import { Icon } from '@/shared/icons/icon';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

export interface ScheduleExceptionsManagerProps {
  exceptions: ScheduleException[];
}

const badgeVariantByType: Record<ScheduleException['type'], 'warning' | 'danger' | 'info'> = {
  vacation: 'warning',
  unavailable: 'danger',
  'extra-hours': 'info',
};

/**
 * Vacation-day / unavailable-date architecture — a date-specific override
 * to the recurring weekly schedule (`WorkingHoursForm`'s domain), backed by
 * real (mocked) POST/DELETE `/scheduling/doctor-exceptions` endpoints. An
 * honest empty list by default: no time off has actually been requested
 * yet, never a fabricated vacation.
 */
export function ScheduleExceptionsManager({ exceptions }: ScheduleExceptionsManagerProps) {
  const t = useTranslations('scheduling.timeOff');
  const tType = useTranslations('scheduling.timeOff.type');
  const tValidation = useTranslations('scheduling.timeOff.validation');
  const format = useFormatter();
  const addException = useAddDoctorException();
  const removeException = useRemoveDoctorException();

  const form = useForm<ScheduleExceptionFormValues>({
    resolver: zodResolver(createScheduleExceptionSchema(tValidation)),
    defaultValues: { date: '', type: 'vacation', reason: '' },
  });

  async function onSubmit(values: ScheduleExceptionFormValues) {
    try {
      await addException.mutateAsync(values);
      form.reset({ date: '', type: 'vacation', reason: '' });
    } catch {
      // Inline error rendered below from `addException.error`.
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          {addException.error instanceof ApiError && (
            <Alert variant="danger" role="alert">
              {addException.error.message}
            </Alert>
          )}
          <div className="flex flex-wrap items-end gap-3">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('date')}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('typeLabel')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="vacation">{tType('vacation')}</SelectItem>
                      <SelectItem value="unavailable">{tType('unavailable')}</SelectItem>
                      <SelectItem value="extra-hours">{tType('extra-hours')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>{t('reason')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" loading={addException.isPending}>
              {t('add')}
            </Button>
          </div>
        </form>
      </Form>

      {exceptions.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />
      ) : (
        <ul className="flex flex-col gap-2">
          {exceptions.map((exception) => (
            <li
              key={exception.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border-default p-3"
            >
              <div className="flex items-center gap-3">
                <p className="text-sm font-medium text-text-primary">
                  {format.dateTime(new Date(exception.date), { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
                <Badge variant={badgeVariantByType[exception.type]}>{tType(exception.type)}</Badge>
                {exception.reason && <span className="text-sm text-text-tertiary">{exception.reason}</span>}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t('remove')}
                onClick={() => removeException.mutate(exception.id)}
              >
                <Icon icon={Trash2} size="sm" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
