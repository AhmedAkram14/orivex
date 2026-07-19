import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { paymentApi } from '@/features/payment/api/payment-api';
import type { PaymentTransaction } from '@/features/payment/api/types';

import { RefundButton } from './refund-button';

vi.mock('@/features/payment/api/payment-api', () => ({
  paymentApi: { refund: vi.fn() },
}));

describe('RefundButton', () => {
  it('refunds the payment and shows a success alert', async () => {
    vi.mocked(paymentApi.refund).mockResolvedValue({
      id: 'payment-1',
      consultationSessionId: null,
      amount: { amount: 500, currency: 'EGP' },
      status: 'refunded',
      createdAt: new Date().toISOString(),
    } satisfies PaymentTransaction);

    renderWithProviders(<RefundButton paymentTransactionId="payment-1" />);

    await userEvent.click(screen.getByRole('button', { name: 'Refund' }));

    await waitFor(() => expect(screen.getByText('Payment refunded.')).toBeInTheDocument());
    expect(paymentApi.refund).toHaveBeenCalledWith('payment-1');
  });
});
