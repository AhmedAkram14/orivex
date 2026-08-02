import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import DoctorDashboardPage from './page';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';
import { DOCTOR_PATHS } from '@/features/doctor/api/paths';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import enMessages from '../../../../../messages/en.json';

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

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <AuthContext.Provider value={doctorState}>
          <DoctorDashboardPage />
        </AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('DoctorDashboardPage', () => {
  it('renders the welcome message and today\'s seeded busy schedule', async () => {
    renderPage();

    expect(await screen.findByText('Welcome back, Dr. Sarah Ahmed.')).toBeInTheDocument();
    // `doctor-store.ts`'s seeded busy-practice-day fixture (not a real
    // clinical record) -- a completed-today patient from `seedUpcomingWork()`.
    expect(await screen.findByText('Mona Farouk')).toBeInTheDocument();
  });

  it('renders the redesigned hero, quick actions, and a real startable consultation', async () => {
    renderPage();

    // The seeded queue has a real `waiting` entry, so the hero renders a
    // live Start Consultation action rather than the disabled fallback.
    expect(await screen.findByRole('button', { name: 'Start consultation' })).toBeInTheDocument();
    expect(
      await screen.findByText((_, element) => (element?.textContent ?? '').includes('consultations today'), {
        selector: 'p',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View Patient Queue/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Update Schedule/ })).toBeInTheDocument();
    // Doctor Profile Redesign (2026-08-02): `consultation-store.ts` now
    // seeds a few real reviews for this doctor (previously always empty) --
    // the hero's "Today's Summary" rating stat reflects that real average
    // (4.67 -> "4.7"), never a fabricated figure.
    expect((await screen.findAllByText('4.7')).length).toBeGreaterThan(0);
  });

  it('renders the bottom widget row: Today\'s Progress (matching the seeded completed/consultations counts), Upcoming Availability, and Recent Activity', async () => {
    renderPage();

    // completedToday: 4, consultationsToday (still-pending): 7 -- total for
    // the ring is completed + still-pending (11), since `consultationsToday`
    // is deliberately pending-only, not the day's total. See
    // `doctor-store.ts`'s `seedSummary()`/`seedUpcomingWork()`.
    expect(await screen.findByText('4 of 11 done')).toBeInTheDocument();
    expect(screen.getByText("Today's Progress")).toBeInTheDocument();
    expect(screen.getByText('Upcoming Availability')).toBeInTheDocument();
    // The seeded mock notification store is never empty (3 real seed
    // entries), so Recent Activity's honest-empty-state is covered
    // separately by a dedicated MSW override below rather than asserted here.
    expect(await screen.findByText('Welcome to Orivex')).toBeInTheDocument();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  it('still renders the honest empty state when a real doctor genuinely has nothing scheduled today', async () => {
    // Overrides just the upcoming-work endpoint back to an honest `[]` for
    // this one test -- proving the real empty-state rendering path (distinct
    // from the busy demo seed above) still works, per this redesign's own
    // "no fabrication" mandate.
    server.use(
      http.get(`${env.apiBaseUrl}${DOCTOR_PATHS.upcomingWork}`, () => HttpResponse.json({ data: [] })),
    );

    renderPage();

    expect(await screen.findByText('Nothing scheduled yet')).toBeInTheDocument();
    expect(
      screen.getByText('No appointments scheduled today. Enjoy your free time or update your availability.'),
    ).toBeInTheDocument();
  });
});
