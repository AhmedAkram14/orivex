import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';

import { DisputeQueue } from './dispute-queue';

const base = () => env.apiBaseUrl;

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function openDispute() {
  return {
    id: 'dispute-1',
    appointmentId: 'appointment-1',
    raisedByAccountId: 'patient-account-1',
    reason: 'The doctor never joined the call.',
    status: 'open',
    resolutionNotes: null,
    resolvedByAccountId: null,
    resolvedAt: null,
    createdAt: new Date().toISOString(),
  };
}

describe('DisputeQueue', () => {
  it('shows the empty state when nothing is open', async () => {
    server.use(http.get(`${base()}/admin/disputes`, () => HttpResponse.json({ data: [] })));

    renderWithProviders(<DisputeQueue />);

    expect(await screen.findByText('No open disputes')).toBeInTheDocument();
  });

  it('lists an open dispute and resolves it with notes', async () => {
    server.use(http.get(`${base()}/admin/disputes`, () => HttpResponse.json({ data: [openDispute()] })));

    let sentBody: unknown;
    server.use(
      http.patch(`${base()}/admin/disputes/:id/resolve`, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json({ data: { ...openDispute(), status: 'resolved' } });
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<DisputeQueue />);

    await screen.findByText('The doctor never joined the call.');

    await user.click(screen.getByRole('button', { name: 'Resolve' }));
    await user.type(screen.getByPlaceholderText('Explain your decision'), 'Refunded the patient in full.');
    await user.click(screen.getByRole('button', { name: 'Resolve dispute' }));

    await waitFor(() =>
      expect(sentBody).toEqual({ status: 'resolved', resolutionNotes: 'Refunded the patient in full.' }),
    );
  });

  it('shows a load error when the queue request fails', async () => {
    server.use(
      http.get(`${base()}/admin/disputes`, () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL', message: 'boom', requestId: 'r', timestamp: new Date().toISOString() } },
          { status: 500 },
        ),
      ),
    );

    renderWithProviders(<DisputeQueue />);

    expect(await screen.findByText("Couldn't load the dispute queue.")).toBeInTheDocument();
  });
});
