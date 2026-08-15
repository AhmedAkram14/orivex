'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm, useWatch } from 'react-hook-form';
import { useUpdateUpcomingSlotPricing } from '@/features/scheduling/hooks/use-update-upcoming-slot-pricing';
import { createSlotPricingSchema, type SlotPricingFormValues } from '@/features/scheduling/schemas/slot-pricing.schema';
import type { AvailabilityWindowData } from '@/features/scheduling/types';
import { ApiError } from '@/shared/lib/api/client';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { FilterTabs } from '@/shared/ui/filter-tabs';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';

export interface SlotPricingDialogProps {
  window: AvailabilityWindowData;
  timeLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Consultation Pricing Redesign: the per-slot override -- a doctor
 * repricing (or flipping Free/Paid on) one already-generated, still-`open`
 * window without touching the recurring template it came from. Only ever
 * rendered for an `open` window (`UpcomingSlotsPanel` never offers this for
 * a `held`/`booked` one) -- the backend re-enforces the same Open-only
 * guard regardless, but the UI never even presents the option.
 */
export function SlotPricingDialog({ window, timeLabel, open, onOpenChange }: SlotPricingDialogProps) {
  const t = useTranslations('doctor.schedule.upcomingSlots');
  const tValidation = useTranslations('scheduling.availability.validation');
  const updatePricing = useUpdateUpcomingSlotPricing();

  const form = useForm<SlotPricingFormValues>({
    resolver: zodResolver(createSlotPricingSchema(tValidation)),
    values: {
      pricingType: window.consultationType,
      feeAmount: window.feeAmount,
      feeCurrency: window.feeCurrency ?? 'EGP',
    },
  });
  const pricingType = useWatch({ control: form.control, name: 'pricingType' });

  async function onSubmit(values: SlotPricingFormValues) {
    try {
      await updatePricing.mutateAsync({
        id: window.id,
        request: {
          pricingType: values.pricingType,
          feeAmount: values.pricingType === 'paid' ? (values.feeAmount ?? undefined) : undefined,
          feeCurrency: values.pricingType === 'paid' ? (values.feeCurrency ?? undefined) : undefined,
        },
      });
      onOpenChange(false);
    } catch {
      // Inline error rendered below from `updatePricing.error`.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('editDialogTitle', { time: timeLabel })}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            {updatePricing.error instanceof ApiError && (
              <Alert variant="danger" role="alert">
                {updatePricing.error.message}
              </Alert>
            )}

            <FormField
              control={form.control}
              name="pricingType"
              render={({ field }) => (
                <FilterTabs
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: 'free', label: t('pricingTypeFree') },
                    { value: 'paid', label: t('pricingTypePaid') },
                  ]}
                />
              )}
            />

            {pricingType === 'paid' && (
              <div className="flex items-center gap-2">
                <FormField
                  control={form.control}
                  name="feeAmount"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          aria-label={t('feeAmountLabel')}
                          value={field.value ?? ''}
                          onChange={(event) => field.onChange(event.target.value === '' ? null : Number(event.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="feeCurrency"
                  render={({ field }) => (
                    <FormItem className="w-24">
                      <FormControl>
                        <Input
                          type="text"
                          maxLength={3}
                          placeholder="EGP"
                          aria-label={t('feeCurrencyLabel')}
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit" loading={updatePricing.isPending}>
                {t('save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
