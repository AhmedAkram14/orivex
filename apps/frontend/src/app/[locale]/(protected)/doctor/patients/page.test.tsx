import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
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
    // `doctor-store.ts`'s seeded busy-practice-day roster (not a real
    // clinical record).
    expect(await screen.findByText('Mona Farouk')).toBeInTheDocument();
    expect(screen.getByText('Layla Ibrahim')).toBeInTheDocument();
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
              lastVisitAt: '2026-01-15T10:00:00.000Z',
              lastVisitStatus: 'completed',
            },
          ],
        }),
      ),
    );

    renderPage();

    expect(await screen.findByText('Amina Youssef')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });
});
