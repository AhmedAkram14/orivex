import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import PatientDashboardPage from './page';
import { server } from '@/mocks/server';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import { env } from '@/shared/lib/env';
import enMessages from '../../../../../messages/en.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/patient',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const patientState: AuthState = {
  status: 'authenticated',
  user: { id: '1', email: 'patient@orivex.dev', fullName: 'Amina Youssef', roles: ['patient'] },
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <AuthContext.Provider value={patientState}>
          <PatientDashboardPage />
        </AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('PatientDashboardPage', () => {
  it('renders the welcome message and an honest zero-state summary', async () => {
    renderPage();

    expect(await screen.findByText(/Amina/)).toBeInTheDocument();
    expect(await screen.findByText("Here's what's happening with your health today.")).toBeInTheDocument();
    expect(await screen.findByText('No upcoming appointments')).toBeInTheDocument();
    expect(await screen.findByText('No appointments scheduled yet')).toBeInTheDocument();
    expect(await screen.findByText('No active prescriptions')).toBeInTheDocument();
  });

  it('highlights the real soonest upcoming appointment as the Next Appointment hero, with a real join action', async () => {
    // Join-Window Enforcement feature: within the 15-minutes-before window
    // (canJoinCall), not an arbitrary "in the future" time -- this test is
    // about the hero card surfacing a real Join action, not about window
    // boundaries themselves (covered by appointment-time.test.ts).
    const soon = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    server.use(
      http.get(`${env.apiBaseUrl}/appointments/me`, () =>
        HttpResponse.json({
          data: [
            {
              id: 'appt-1',
              scheduledAt: soon,
              doctorName: 'Dr. Hany Sameh',
              specialization: 'Orthopedics',
              status: 'confirmed',
              consultationType: 'free',
              consultationSessionId: 'session-1',
              paymentRequired: false,
              feeAmount: null,
            },
          ],
        }),
      ),
    );

    renderPage();

    expect((await screen.findAllByText(/Dr\. Hany Sameh/)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/Orthopedics/)).length).toBeGreaterThan(0);
    expect(await screen.findByText('Join video call')).toBeInTheDocument();
  });
});
