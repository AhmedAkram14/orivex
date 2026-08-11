import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { server } from '@/mocks/server';
import { resetPaymentStore, seedTransaction } from '@/mocks/payment-store';

import { RefundButton } from './refund-button';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetPaymentStore();
});
afterAll(() => server.close());

describe('RefundButton', () => {
  it('refunds the payment and shows a success alert', async () => {
    seedTransaction({
      id: 'payment-1',
      appointmentId: 'appointment-1',
      consultationSessionId: null,
      amount: { amount: 500, currency: 'EGP' },
      status: 'succeeded',
      createdAt: new Date().toISOString(),
    });

    renderWithProviders(<RefundButton paymentTransactionId="payment-1" />);

    await userEvent.click(screen.getByRole('button', { name: 'Refund' }));

    await waitFor(() => expect(screen.getByText('Payment refunded.')).toBeInTheDocument());
  });
});
