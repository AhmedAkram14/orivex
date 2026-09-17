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

function openDispute(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'dispute-1',
    appointmentId: 'appointment-1',
    raisedByAccountId: 'patient-account-1',
    reason: 'The doctor never joined the call.',
    category: 'no_show',
    attachmentAssetId: null,
    status: 'open',
    resolutionNotes: null,
    resolvedByAccountId: null,
    resolvedAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('DisputeQueue', () => {
  it('shows the empty state when nothing is open', async () => {
    server.use(http.get(`${base()}/admin/disputes`, () => HttpResponse.json({ data: [] })));

    renderWithProviders(<DisputeQueue />);

    expect(await screen.findByText('No open disputes')).toBeInTheDocument();
  });

  it('shows a category badge on every row', async () => {
    server.use(http.get(`${base()}/admin/disputes`, () => HttpResponse.json({ data: [openDispute()] })));

    renderWithProviders(<DisputeQueue />);

    await screen.findByText('The doctor never joined the call.');
    expect(screen.getByText('No-show')).toBeInTheDocument();
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

    const user = userEvent.setup({ delay: null });
    renderWithProviders(<DisputeQueue />);

    await screen.findByText('The doctor never joined the call.');

    await user.click(screen.getByRole('button', { name: 'Resolve' }));
    await user.type(screen.getByPlaceholderText('Explain your decision'), 'Refunded the patient in full.');
    await user.click(screen.getByRole('button', { name: 'Resolve dispute' }));

    await waitFor(() =>
      expect(sentBody).toEqual({ status: 'resolved', resolutionNotes: 'Refunded the patient in full.' }),
    );
  }, 15000);

  it('sends the real status/category query params and never the literal string "undefined"', async () => {
    const requestedUrls: string[] = [];
    server.use(
      http.get(`${base()}/admin/disputes`, ({ request }) => {
        requestedUrls.push(request.url);
        return HttpResponse.json({ data: [openDispute()] });
      }),
    );

    const user = userEvent.setup({ delay: null });
    renderWithProviders(<DisputeQueue />);
    await screen.findByText('The doctor never joined the call.');

    // Default render: status=open, no category param at all.
    expect(requestedUrls[0]).toContain('status=open');
    expect(requestedUrls[0]).not.toContain('undefined');

    await user.click(screen.getByRole('combobox', { name: 'Filter by category' }));
    await user.click(await screen.findByRole('option', { name: 'No-show' }));

    await waitFor(() => expect(requestedUrls.some((url) => url.includes('category=no_show'))).toBe(true));
    expect(requestedUrls.every((url) => !url.includes('undefined'))).toBe(true);
  }, 15000);

  it('filters to a specific past status via the status Select', async () => {
    server.use(
      http.get(`${base()}/admin/disputes`, ({ request }) => {
        const status = new URL(request.url).searchParams.get('status');
        if (status === 'dismissed') {
          return HttpResponse.json({ data: [openDispute({ id: 'dispute-2', status: 'dismissed', reason: 'A billing complaint was dismissed.' })] });
        }
        return HttpResponse.json({ data: [openDispute()] });
      }),
    );

    const user = userEvent.setup({ delay: null });
    renderWithProviders(<DisputeQueue />);
    await screen.findByText('The doctor never joined the call.');

    await user.click(screen.getByRole('combobox', { name: 'Filter by status' }));
    await user.click(await screen.findByRole('option', { name: 'Dismissed' }));

    expect(await screen.findByText('A billing complaint was dismissed.')).toBeInTheDocument();
    expect(screen.queryByText('The doctor never joined the call.')).not.toBeInTheDocument();
    // A dismissed dispute is terminal -- no Resolve/Dismiss actions on it.
    expect(screen.queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument();
  }, 15000);

  it('"all" fans out real per-status requests and merges the results', async () => {
    server.use(
      http.get(`${base()}/admin/disputes`, ({ request }) => {
        const status = new URL(request.url).searchParams.get('status');
        if (status === 'resolved') {
          return HttpResponse.json({ data: [openDispute({ id: 'dispute-resolved', status: 'resolved', reason: 'A resolved billing issue.' })] });
        }
        if (status === 'open') {
          return HttpResponse.json({ data: [openDispute()] });
        }
        return HttpResponse.json({ data: [] });
      }),
    );

    const user = userEvent.setup({ delay: null });
    renderWithProviders(<DisputeQueue />);
    await screen.findByText('The doctor never joined the call.');

    await user.click(screen.getByRole('combobox', { name: 'Filter by status' }));
    await user.click(await screen.findByRole('option', { name: 'All' }));

    expect(await screen.findByText('A resolved billing issue.')).toBeInTheDocument();
    expect(screen.getByText('The doctor never joined the call.')).toBeInTheDocument();
  }, 15000);

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
