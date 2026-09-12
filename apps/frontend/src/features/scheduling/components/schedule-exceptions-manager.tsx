'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { MoreVertical, Trash2 } from 'lucide-react';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';
import { EmptyState } from '@/shared/ui/empty-state';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

const badgeVariantByType: Record<ScheduleException['type'], 'warning' | 'danger' | 'info'> = {
  vacation: 'warning',
  unavailable: 'danger',
  'extra-hours': 'info',
};

export interface ScheduleExceptionFormProps {
  /** Called after a successful add — the Schedule page's Time Off dialog closes itself on this. */
  onAdded?: () => void;
}

/**
 * The "add a date-specific override" form — split out from the read-only
 * list (`ScheduleExceptionsTable` below) so the Schedule page redesign can
 * host this inside a `Dialog` (triggered by a real "+ Add time off" CTA)
 * while the list renders inline in the Time Off card as an always-visible
 * table, matching how `WorkingHoursForm`'s edit flow and its own read-only
 * summary are likewise two separate surfaces now.
 */
export function ScheduleExceptionForm({ onAdded }: ScheduleExceptionFormProps) {
  const t = useTranslations('scheduling.timeOff');
  const tType = useTranslations('scheduling.timeOff.type');
  const tValidation = useTranslations('scheduling.timeOff.validation');
  const addException = useAddDoctorException();

  const form = useForm<ScheduleExceptionFormValues>({
    resolver: zodResolver(createScheduleExceptionSchema(tValidation)),
    defaultValues: { date: '', type: 'vacation', reason: '' },
  });

  async function onSubmit(values: ScheduleExceptionFormValues) {
    try {
      await addException.mutateAsync(values);
      form.reset({ date: '', type: 'vacation', reason: '' });
      onAdded?.();
    } catch {
      // Inline error rendered below from `addException.error`.
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {addException.error instanceof ApiError && (
          <Alert variant="danger" role="alert">
            {addException.error.message}
          </Alert>
        )}
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
                  <SelectTrigger>
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
            <FormItem>
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
      </form>
    </Form>
  );
}

export interface ScheduleExceptionsTableProps {
  exceptions: ScheduleException[];
}

/** The Time Off card's always-visible read-only list — a real `Table` (Date/Type/Reason/Actions), replacing the old plain `<ul>` rows so it matches the rest of the redesigned Schedule page's denser, tabular "Weekly Availability"/"Time Off" section. */
export function ScheduleExceptionsTable({ exceptions }: ScheduleExceptionsTableProps) {
  const t = useTranslations('scheduling.timeOff');
  const tType = useTranslations('scheduling.timeOff.type');
  const format = useFormatter();
  const removeException = useRemoveDoctorException();

  if (exceptions.length === 0) {
    return <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>{t('date')}</TableHead>
          <TableHead>{t('typeLabel')}</TableHead>
          <TableHead>{t('reasonColumnLabel')}</TableHead>
          <TableHead className="text-end">{t('actionsColumnLabel')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {exceptions.map((exception) => {
          const dateLabel = format.dateTime(new Date(exception.date), { year: 'numeric', month: 'short', day: 'numeric' });
          return (
          <TableRow key={exception.id}>
            <TableCell className="font-medium">{dateLabel}</TableCell>
            <TableCell>
              <Badge variant={badgeVariantByType[exception.type]}>{tType(exception.type)}</Badge>
            </TableCell>
            <TableCell className="text-text-secondary">{exception.reason ?? '—'}</TableCell>
            <TableCell className="text-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={t('rowActionsFor', { date: dateLabel })}
                    className="inline-flex size-8 items-center justify-center rounded-md text-text-tertiary transition-colors duration-(--duration-fast) hover:bg-secondary-subtle hover:text-text-secondary"
                  >
                    <Icon icon={MoreVertical} size="sm" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-danger"
                    onSelect={() => removeException.mutate(exception.id)}
                  >
                    <Icon icon={Trash2} size="sm" />
                    {t('remove')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
