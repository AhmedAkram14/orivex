'use client';

import { useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { useFormatter, useTranslations } from 'next-intl';
import { useInitiateCharge } from '@/features/payment/hooks/use-initiate-charge';
import type { Money } from '@/features/payment/api/types';
import { formatCurrency } from '@/shared/lib/currency/format-currency';
import { IdentityVerificationGate } from '@/features/patient/components/identity-verification/identity-verification-gate';
import { ApiError } from '@/shared/lib/api/client';
import { SHARED_ERROR_CODES } from '@/shared/lib/api/error-codes';
import { usePathname } from '@/shared/i18n/navigation';
import { env } from '@/shared/lib/env';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';

export interface PayNowFormProps {
  appointmentId: string;
  amount: Money;
  onPaid?: () => void;
}

/**
 * Loaded lazily and memoized module-wide (loadStripe's own recommended
 * pattern) -- never re-created per render, which would re-mount Stripe.js
 * on every parent re-render.
 */
let stripePromise: ReturnType<typeof loadStripe> | undefined;
function getStripe() {
  if (!stripePromise && env.stripePublishableKey) {
    stripePromise = loadStripe(env.stripePublishableKey);
  }
  return stripePromise;
}

/** Public entry point — wraps the actual form in Stripe's <Elements> provider, or an honest "not configured" state if no publishable key is set (mirrors the backend's NotConfiguredPaymentGatewayAdapter idiom: fail loud and explicit, never fake a working payment form). */
export function PayNowForm(props: PayNowFormProps) {
  const t = useTranslations('payment');
  const stripe = getStripe();

  if (!stripe) {
    return <Alert variant="warning">{t('notConfigured')}</Alert>;
  }

  return (
    <Elements stripe={stripe}>
      <PayNowCardForm {...props} />
    </Elements>
  );
}

function PayNowCardForm({ appointmentId, amount, onPaid }: PayNowFormProps) {
  const t = useTranslations('payment');
  const format = useFormatter();
  const pathname = usePathname();
  const stripe = useStripe();
  const elements = useElements();
  const initiateCharge = useInitiateCharge(appointmentId);
  const [cardError, setCardError] = useState<string | null>(null);

  // Phase 8: previously `new Intl.NumberFormat(undefined, ...)`, which used
  // the browser's own locale instead of the app's negotiated locale -- a
  // real divergence under Arabic. Now routed through the same shared
  // `formatCurrency` helper (backed by next-intl's `useFormatter()`) as
  // `doctor-earnings-summary.tsx` and `features/scheduling/utils/pricing.ts`.
  const formattedAmount = useMemo(
    () => formatCurrency(format, amount.amount, amount.currency),
    [amount, format],
  );

  // Onboarding Redesign (2026-07-21 proposal, Stage O.4/O.7): the real
  // security boundary (RequiresIdentityVerificationGuard on POST /payments)
  // surfaces as this exact ApiError code.
  if (initiateCharge.error instanceof ApiError && initiateCharge.error.code === SHARED_ERROR_CODES.identityVerificationRequired) {
    return <IdentityVerificationGate action="payment" returnTo={pathname} />;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    setCardError(null);
    const { paymentMethod, error } = await stripe.createPaymentMethod({ type: 'card', card: cardElement });
    if (error || !paymentMethod) {
      setCardError(error?.message ?? t('cardError'));
      return;
    }

    initiateCharge.mutate(
      { amount, paymentMethod: 'card', paymentMethodToken: paymentMethod.id },
      { onSuccess: () => onPaid?.() },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" aria-label={t('formLabel')}>
      <p className="text-sm text-text-secondary">{t('amountDue', { amount: formattedAmount })}</p>
      <div className="rounded-md border border-border-default bg-surface p-3">
        <CardElement options={{ hidePostalCode: true }} />
      </div>
      {(cardError || initiateCharge.isError) && (
        <Alert variant="danger">{cardError ?? t('chargeFailed')}</Alert>
      )}
      <Button type="submit" loading={initiateCharge.isPending} disabled={!stripe}>
        {t('payNow')}
      </Button>
    </form>
  );
}
