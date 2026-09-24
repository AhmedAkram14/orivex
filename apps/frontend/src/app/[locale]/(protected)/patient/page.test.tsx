import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configure, render, screen, waitFor } from '@testing-library/react';
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

// This page mounts ~8 data-driven cards; under a parallel full-suite run the
// default 1000ms findBy/waitFor window is too tight even though each test
// passes in ~1s alone (same timing-margin fix as doctor/schedule/page.test.tsx).
configure({ asyncUtilTimeout: 8000 });

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

function appointment(id: string, status: string, scheduledAt: string, doctorName = 'Dr. Hany Sameh') {
  return {
    id,
    scheduledAt,
    doctorId: 'doctor-1',
    doctorName,
    specialization: 'Orthopedics',
    specializationAr: null,
    status,
    consultationType: 'free',
    consultationSessionId: null,
    paymentRequired: false,
    feeAmount: null,
  };
}

function mockAppointments(data: ReturnType<typeof appointment>[]) {
  server.use(http.get(`${env.apiBaseUrl}/appointments/me`, () => HttpResponse.json({ data })));
}

const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

describe('PatientDashboardPage', () => {
  it('renders the welcome message and an honest zero-state summary', async () => {
    renderPage();

    expect(await screen.findByText(/Amina/)).toBeInTheDocument();
    expect(await screen.findByText("Here's what's happening with your health today.")).toBeInTheDocument();
    expect(await screen.findByText('No upcoming appointments')).toBeInTheDocument();
    expect(await screen.findByText('No appointments scheduled yet')).toBeInTheDocument();
    expect(await screen.findByText('No active prescriptions right now.')).toBeInTheDocument();
  });

  it('highlights the real soonest upcoming appointment as the Next Appointment hero, with a real join action', async () => {
    // Join-Window Enforcement feature: within the 30-minutes-before window
    // (canJoinCall), not an arbitrary "in the future" time -- this test is
    // about the hero card surfacing a real Join action, not about window
    // boundaries themselves (covered by shared/lib/consultation/join-window.test.ts).
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

  it('never shows a weeks-old Confirmed appointment as the next one -- the hero shows the empty state, the summary strip counts 0, and it is surfaced under Needs your attention instead', async () => {
    mockAppointments([appointment('stale', 'confirmed', daysFromNow(-16))]);
    renderPage();

    expect(await screen.findByText('No upcoming appointments')).toBeInTheDocument();
    expect(screen.queryByText('NEXT APPOINTMENT')).not.toBeInTheDocument();
    expect(await screen.findByRole('region', { name: 'Needs your attention' })).toBeInTheDocument();
    expect(screen.getByText('Awaiting an update from Dr. Hany Sameh')).toBeInTheDocument();

    await waitFor(() => expect(screen.getAllByText('Upcoming appointments')[0]!.closest('div')).toHaveTextContent('0'));
  });

  it('offers "Book again" with the last completed doctor when nothing is upcoming', async () => {
    mockAppointments([appointment('done', 'completed', daysFromNow(-20), 'Dr. Dalia Anwar')]);
    renderPage();

    const bookAgain = await screen.findByRole('link', { name: 'Book again with Dr. Dalia Anwar' });
    expect(bookAgain).toHaveAttribute('href', '/en/patient/appointments/book?doctorId=doctor-1');
    // The hero's primary CTA and the quick action both go to the doctor directory, never the dead-end booking page.
    const bookLinks = screen.getAllByRole('link', { name: 'Book appointment' });
    expect(bookLinks.length).toBeGreaterThan(0);
    for (const link of bookLinks) expect(link).toHaveAttribute('href', '/en/patient/doctors');
  });

  it('shows the same upcoming count in the summary strip as the number of genuinely upcoming appointments, with a deep link to the row', async () => {
    mockAppointments([
      appointment('future-1', 'confirmed', daysFromNow(2)),
      appointment('future-2', 'requested', daysFromNow(5)),
      appointment('stale', 'confirmed', daysFromNow(-16)),
      appointment('cancelled', 'cancelled', daysFromNow(3)),
    ]);
    renderPage();

    const viewLinks = await screen.findAllByRole('link', { name: /View appointment/ });
    // The hero links the soonest genuinely upcoming appointment; the stale one is only linked from Needs your attention.
    const hrefs = viewLinks.map((link) => link.getAttribute('href'));
    expect(hrefs).toContain('/en/patient/appointments?highlight=future-1');
    expect(hrefs).toContain('/en/patient/appointments?highlight=stale');
    expect(hrefs).not.toContain('/en/patient/appointments?highlight=future-2');
    await waitFor(() => expect(screen.getAllByText('Upcoming appointments')[0]!.closest('div')).toHaveTextContent('2'));
  });

  it('renders no raw ISO timestamps or unresolved i18n keys anywhere on the page', async () => {
    mockAppointments([appointment('future-1', 'confirmed', daysFromNow(2)), appointment('stale', 'confirmed', daysFromNow(-16))]);
    renderPage();
    await screen.findByRole('region', { name: 'Needs your attention' });

    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(text).not.toContain('publicPatient.');
    expect(text).not.toMatch(/patient\.dashboard\./);
  });
});
