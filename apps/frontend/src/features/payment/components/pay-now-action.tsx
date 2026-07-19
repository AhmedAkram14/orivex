'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PayNowForm } from '@/features/payment/components/pay-now-form';
import type { Money } from '@/features/payment/api/types';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';

export interface PayNowActionProps {
  consultationSessionId: string;
  amount: Money;
}

/**
 * The reachable entry point into the payment flow (ORIVEX Roadmap 2.0 Stage
 * 1) — a "Pay now" button on a Paid-and-unconfirmed appointment card, which
 * opens `PayNowForm` in a dialog. Closes itself automatically once the
 * charge succeeds (the appointment list refetches via the same
 * cache-invalidation `useInitiateCharge` already wires up).
 */
export function PayNowAction({ consultationSessionId, amount }: PayNowActionProps) {
  const t = useTranslations('payment');
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        {t('payNow')}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('formLabel')}</DialogTitle>
        </DialogHeader>
        <PayNowForm consultationSessionId={consultationSessionId} amount={amount} onPaid={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
