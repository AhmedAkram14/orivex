import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import DoctorPatientsPage from './page';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import enMessages from '../../../../../../messages/en.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/doctor/patients',
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
          <DoctorPatientsPage />
        </AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('DoctorPatientsPage', () => {
  it("lists the seeded busy-practice patients with their visit count and status", async () => {
    renderPage();
    // Phase 7 responsive: the table (`data-testid="patients-table"`) and the
    // `md:hidden` card list both render in jsdom regardless of Tailwind
    // breakpoint classes, so an unscoped query matches the same patient name
    // twice -- scope to the desktop table, same pattern as the sibling
    // `patients-list.test.tsx`.
    const table = await screen.findByTestId('patients-table');
    // `doctor-store.ts`'s seeded busy-practice-day roster (not a real
    // clinical record).
    expect(await within(table).findByText('Mona Farouk')).toBeInTheDocument();
    expect(within(table).getByText('Layla Ibrahim')).toBeInTheDocument();
  });

  it('still shows an honest empty state when a real doctor genuinely has no patients yet', async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/appointments/doctor/patients`, () => HttpResponse.json({ data: [] })),
    );
    renderPage();
    expect(await screen.findByText('No patients yet')).toBeInTheDocument();
  });

  it('lists real patients with their visit count, last visit date, and status', async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/appointments/doctor/patients`, () =>
        HttpResponse.json({
          data: [
            {
              patientProfileId: 'patient-1',
              patientName: 'Amina Youssef',
              visitCount: 3,
              // Recent enough to fall inside derivePatientStatus's 90-day
              // "still Completed, not yet Inactive" window.
              lastVisitAt: new Date(Date.now() - 10 * 24 * 60 * 60_000).toISOString(),
              lastVisitStatus: 'completed',
            },
          ],
        }),
      ),
    );

    renderPage();

    const table = await screen.findByTestId('patients-table');
    expect(await within(table).findByText('Amina Youssef')).toBeInTheDocument();
    expect(within(table).getByText('3')).toBeInTheDocument();
    expect(within(table).getByText('Completed')).toBeInTheDocument();
  });

  it('shows an honest "None yet" for a patient with no completed visit -- regression: lastVisitAt used to be the most recently *scheduled* appointment regardless of status, so a Cancelled or still-pending one rendered its date labelled as a "visit"', async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/appointments/doctor/patients`, () =>
        HttpResponse.json({
          data: [
            {
              patientProfileId: 'patient-1',
              patientName: 'Iman Rashad',
              visitCount: 0,
              nextAppointmentAt: undefined,
              hasFollowUpRecommendation: false,
            },
          ],
        }),
      ),
    );

    renderPage();

    const table = await screen.findByTestId('patients-table');
    expect(await within(table).findByText('Iman Rashad')).toBeInTheDocument();
    expect(within(table).getByText('None yet')).toBeInTheDocument();
    expect(within(table).queryByText('Invalid Date')).not.toBeInTheDocument();
    expect(within(table).getByText('Inactive')).toBeInTheDocument();
  });
});
