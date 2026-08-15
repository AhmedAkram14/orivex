import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { AdminPaymentsTable } from './admin-payments-table';
import { resetPaymentStore, seedAdminPaymentMeta, seedTransaction } from '@/mocks/payment-store';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';
import enMessages from '../../../../messages/en.json';

const base = () => env.apiBaseUrl;

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetPaymentStore();
});
afterAll(() => server.close());

function renderTable() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <AdminPaymentsTable />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('AdminPaymentsTable', () => {
  it('shows the empty state when there are no transactions', async () => {
    renderTable();

    expect(await screen.findByText('No transactions yet')).toBeInTheDocument();
  });

  it('lists a real transaction with resolved names, and shows a refund action for a refundable status', async () => {
    seedTransaction({
      id: 'payment-1',
      appointmentId: 'appointment-1',
      consultationSessionId: null,
      amount: { amount: 500, currency: 'EGP' },
      status: 'succeeded',
      createdAt: new Date().toISOString(),
    });
    seedAdminPaymentMeta('payment-1', 'Youssef Ibrahim', 'Dr. Amina Hassan');

    renderTable();

    expect(await screen.findByText('Youssef Ibrahim')).toBeInTheDocument();
    expect(screen.getByText('Dr. Amina Hassan')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refund' })).toBeInTheDocument();
  });

  it('hides the refund action once a transaction is already refunded', async () => {
    seedTransaction({
      id: 'payment-refunded',
      appointmentId: 'appointment-2',
      consultationSessionId: null,
      amount: { amount: 300, currency: 'EGP' },
      status: 'refunded',
      createdAt: new Date().toISOString(),
    });
    seedAdminPaymentMeta('payment-refunded', 'Refunded Patient', 'Refunded Doctor');

    renderTable();

    expect(await screen.findByText('Refunded Patient')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Refund' })).not.toBeInTheDocument();
    expect(screen.getByText('No action available')).toBeInTheDocument();
  });

  it('refunds a payment through the confirm dialog and reflects the refunded status', async () => {
    seedTransaction({
      id: 'payment-2',
      appointmentId: 'appointment-3',
      consultationSessionId: null,
      amount: { amount: 700, currency: 'EGP' },
      status: 'succeeded',
      createdAt: new Date().toISOString(),
    });
    seedAdminPaymentMeta('payment-2', 'Confirm Patient', 'Confirm Doctor');

    renderTable();
    await screen.findByText('Confirm Patient');

    await userEvent.click(screen.getByRole('button', { name: 'Refund' }));
    expect(await screen.findByText('Refund this payment?')).toBeInTheDocument();

    const dialogRefundButtons = screen.getAllByRole('button', { name: 'Refund' });
    await userEvent.click(dialogRefundButtons[dialogRefundButtons.length - 1]);

    await waitFor(() => expect(screen.getByText('Payment refunded.')).toBeInTheDocument());
    expect(screen.queryByText('Refund this payment?')).not.toBeInTheDocument();
  });

  it('surfaces a gateway rejection honestly instead of swallowing it', async () => {
    seedTransaction({
      id: 'payment-3',
      appointmentId: 'appointment-4',
      consultationSessionId: null,
      amount: { amount: 900, currency: 'EGP' },
      status: 'succeeded',
      createdAt: new Date().toISOString(),
    });
    seedAdminPaymentMeta('payment-3', 'Fail Patient', 'Fail Doctor');
    server.use(
      http.post(`${base()}/admin/payments/payment-3/refund`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'PAYMENT_REQUIRED',
              message: 'Stripe rejected the refund.',
              requestId: 'mock-request',
              timestamp: new Date().toISOString(),
            },
          },
          { status: 402 },
        ),
      ),
    );

    renderTable();
    await screen.findByText('Fail Patient');

    await userEvent.click(screen.getByRole('button', { name: 'Refund' }));
    const dialogRefundButtons = screen.getAllByRole('button', { name: 'Refund' });
    await userEvent.click(dialogRefundButtons[dialogRefundButtons.length - 1]);

    await waitFor(() => expect(screen.getByText('Stripe rejected the refund.')).toBeInTheDocument());
  });

  it('shows a load error when the list request fails', async () => {
    server.use(
      http.get(`${base()}/admin/payments`, () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL', message: 'boom', requestId: 'r', timestamp: new Date().toISOString() } },
          { status: 500 },
        ),
      ),
    );

    renderTable();

    expect(await screen.findByText('Could not load payment transactions.')).toBeInTheDocument();
  });
});
