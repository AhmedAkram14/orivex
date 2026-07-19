import { screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { server } from '@/mocks/server';
import { resetPaymentStore, seedTransaction } from '@/mocks/payment-store';
import type { PaymentTransaction } from '@/features/payment/api/types';

import { RefundQueueAction } from './refund-queue-action';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetPaymentStore();
});
afterAll(() => server.close());

function buildTransaction(overrides: Partial<PaymentTransaction> = {}): PaymentTransaction {
  return {
    id: 'payment-1',
    consultationSessionId: 'session-1',
    amount: { amount: 500, currency: 'EGP' },
    status: 'succeeded',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('RefundQueueAction', () => {
  it('shows a real refund action for a Succeeded/Settled transaction', async () => {
    seedTransaction(buildTransaction());

    renderWithProviders(<RefundQueueAction consultationSessionId="session-1" />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Refund' })).toBeInTheDocument());
  });

  it('renders nothing for a consultation with no charge attempt', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    renderWithProviders(<RefundQueueAction consultationSessionId="session-2" />);

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: 'Refund' })).not.toBeInTheDocument();
  });

  it('renders nothing for an already-refunded transaction', async () => {
    seedTransaction(buildTransaction({ id: 'payment-3', consultationSessionId: 'session-3', status: 'refunded' }));
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    renderWithProviders(<RefundQueueAction consultationSessionId="session-3" />);

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: 'Refund' })).not.toBeInTheDocument();
  });
});
