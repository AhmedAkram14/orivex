import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { RecentActivity } from './recent-activity';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';
import { NOTIFICATIONS_PATHS } from '@/features/notifications/api/paths';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import enMessages from '../../../../messages/en.json';
import arMessages from '../../../../messages/ar.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/doctor',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const doctorState: AuthState = {
  status: 'authenticated',
  user: { id: '1', email: 'doctor@orivex.dev', fullName: 'Dr. Sarah Ahmed', roles: ['doctor'] },
};

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
const interrupted = (id: string, hours: number, read = true) => ({
  id,
  title: 'Consultation interrupted',
  description: 'A consultation was interrupted before it could be completed.',
  severity: 'warning',
  createdAt: hoursAgo(hours),
  read,
  actionUrl: '/doctor/appointments',
  entityType: 'appointment',
  entityId: `appt-${id}`,
});

function renderIn(locale: 'en' | 'ar') {
  server.use(
    http.get(`${env.apiBaseUrl}${NOTIFICATIONS_PATHS.list}`, () =>
      HttpResponse.json({
        data: [
          interrupted('1', 1, false),
          interrupted('2', 3),
          interrupted('3', 20),
          {
            id: '4',
            title: 'New appointment request',
            description: 'A patient requested an appointment.',
            severity: 'info',
            createdAt: hoursAgo(21),
            read: true,
            actionUrl: '/doctor/appointments',
            entityType: 'appointment',
            entityId: 'appt-4',
          },
          interrupted('5', 30),
        ],
        meta: { requestId: 'r', timestamp: new Date().toISOString(), page: 1, limit: 50, total: 5 },
      }),
    ),
  );
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale={locale} messages={locale === 'en' ? enMessages : arMessages} timeZone="Africa/Cairo">
        <AuthContext.Provider value={doctorState}>
          <RecentActivity />
        </AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('RecentActivity (doctor)', () => {
  it('folds consecutive repeats of one type within 24 hours into one counted row, keeping the order', async () => {
    renderIn('en');

    expect(await screen.findByText('3 consultations interrupted')).toBeInTheDocument();
    const rows = screen.getAllByRole('listitem');
    // [3 interrupted] [request] [the older interrupted, 30h ago, on its own]
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent('New appointment request');
    expect(rows[2]).toHaveTextContent('Consultation interrupted');
    // A folded row carries the unread cue when any member is unread.
    expect(rows[0]).toHaveTextContent('Unread');
  });

  it('uses the Arabic counted phrase', async () => {
    renderIn('ar');
    // The digit comes from the runtime's Arabic number format (Western in the browser, Arabic-Indic in Node).
    expect(await screen.findByText(/^انقطاع [3٣] استشارات$/)).toBeInTheDocument();
  });
});
