import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { AuditLogTable } from './audit-log-table';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';
import enMessages from '../../../../messages/en.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/admin/audit-log',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

const base = () => env.apiBaseUrl;

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderTable() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <AuditLogTable />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('AuditLogTable', () => {
  it('shows the empty state when no entries match', async () => {
    renderTable();

    expect(await screen.findByText('No audit entries match these filters')).toBeInTheDocument();
  });

  it('renders real entries returned from the server', async () => {
    server.use(
      http.get(`${base()}/admin/audit-log`, () =>
        HttpResponse.json({
          data: {
            entries: [
              {
                id: 'audit-1',
                actorAccountId: 'doctor-account-1',
                actorRole: 'doctor',
                action: 'health_graph_read',
                subjectType: 'PatientProfile',
                subjectId: 'patient-1',
                reason: null,
                metadata: {},
                createdAt: new Date().toISOString(),
              },
            ],
            total: 1,
            page: 1,
            limit: 25,
          },
        }),
      ),
    );

    renderTable();

    expect(await screen.findByText('health_graph_read')).toBeInTheDocument();
    expect(screen.getByText('doctor-account-1')).toBeInTheDocument();
    expect(screen.getByText('PatientProfile')).toBeInTheDocument();
  });

  it('sends the actor filter through to the server as a real querystring param', async () => {
    const requestedUrls: string[] = [];
    server.events.on('request:start', ({ request }) => {
      if (request.url.includes('/admin/audit-log')) requestedUrls.push(request.url);
    });

    renderTable();
    await screen.findByText('No audit entries match these filters');

    await userEvent.type(screen.getByPlaceholderText('Filter by actor account ID'), 'doctor-account-1');

    await waitFor(() => {
      expect(requestedUrls.some((url) => url.includes('actorAccountId=doctor-account-1'))).toBe(true);
    });
  });

  it('shows a load error when the request fails', async () => {
    server.use(
      http.get(`${base()}/admin/audit-log`, () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL', message: 'boom', requestId: 'r', timestamp: new Date().toISOString() } },
          { status: 500 },
        ),
      ),
    );

    renderTable();

    expect(await screen.findByText("Couldn't load the audit log.")).toBeInTheDocument();
  });
});
