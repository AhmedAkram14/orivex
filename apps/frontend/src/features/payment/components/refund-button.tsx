'use client';

import { useTranslations } from 'next-intl';
import { useRefundPayment } from '@/features/payment/hooks/use-refund-payment';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';

export interface RefundButtonProps {
  paymentTransactionId: string;
}

/** Doctor-facing refund trigger — PaymentController scopes POST /payments/:id/refund to the treating doctor only (no admin role exists yet for payment-adjacent flows). */
export function RefundButton({ paymentTransactionId }: RefundButtonProps) {
  const t = useTranslations('payment');
  const refundPayment = useRefundPayment();

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        loading={refundPayment.isPending}
        onClick={() => refundPayment.mutate(paymentTransactionId)}
      >
        {t('refund')}
      </Button>
      {refundPayment.isSuccess && <Alert variant="success">{t('refundSucceeded')}</Alert>}
      {refundPayment.isError && <Alert variant="danger">{t('refundFailed')}</Alert>}
    </div>
  );
}
