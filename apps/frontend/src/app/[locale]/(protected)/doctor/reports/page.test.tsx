import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import DoctorReportsPage from './page';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import enMessages from '../../../../../../messages/en.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/doctor/reports',
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

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <AuthContext.Provider value={doctorState}>
          <DoctorReportsPage />
        </AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('DoctorReportsPage', () => {
  it("shows the seeded all-time aggregate's real appointment-status counts and rating", async () => {
    renderPage();

    // `doctor-store.ts`'s seeded busy-consultant aggregate (not a real
    // clinical record): confirmed 6 + completed 47 + cancelled 5 + noShow 3
    // = 61 total.
    expect(await screen.findByText('61')).toBeInTheDocument();
    expect(screen.getByText('Total appointments')).toBeInTheDocument();
    expect(screen.getByText('4.6 (41)')).toBeInTheDocument();
  });

  it('still renders an honest zero-count / "no reviews yet" state when a real doctor genuinely has no appointment history', async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/appointments/doctor/reports-summary`, () =>
        HttpResponse.json({
          data: {
            totalAppointments: 0,
            confirmed: 0,
            completed: 0,
            cancelled: 0,
            noShow: 0,
            averageRating: null,
            reviewCount: 0,
          },
        }),
      ),
    );

    renderPage();

    expect(await screen.findByText('No reviews yet')).toBeInTheDocument();
    expect(screen.getByText('Total appointments')).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });

  it('renders real appointment-status counts and rating when present', async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/appointments/doctor/reports-summary`, () =>
        HttpResponse.json({
          data: {
            totalAppointments: 12,
            confirmed: 2,
            completed: 8,
            cancelled: 1,
            noShow: 1,
            averageRating: 4.5,
            reviewCount: 6,
          },
        }),
      ),
    );

    renderPage();

    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('4.5 (6)')).toBeInTheDocument();
  });
});
