import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import DashboardPage from './page';
import { server } from '@/mocks/server';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import { env } from '@/shared/lib/env';
import enMessages from '../../../../../messages/en.json';

const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace, refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/dashboard',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

const base = () => env.apiBaseUrl;

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  replace.mockClear();
});
afterAll(() => server.close());

function renderDashboard(user: AuthState) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <AuthContext.Provider value={user}>
          <DashboardPage />
        </AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

const patientState: AuthState = {
  status: 'authenticated',
  user: { id: '1', email: 'patient@orivex.dev', fullName: 'Amina Youssef', roles: ['patient'] },
};

const doctorState: AuthState = {
  status: 'authenticated',
  user: { id: '2', email: 'doctor@orivex.dev', fullName: 'Dr. Sarah Ahmed', roles: ['doctor'] },
};

const superAdminState: AuthState = {
  status: 'authenticated',
  user: { id: '3', email: 'admin@orivex.dev', fullName: 'Admin User', roles: ['super_admin'] },
};

describe('DashboardPage', () => {
  it('redirects a patient-role account with neither profile to /journey', async () => {
    server.use(
      http.get(`${base()}/doctors/me`, () =>
        HttpResponse.json(
          { error: { code: 'NOT_FOUND', message: 'not found', requestId: 'r', timestamp: new Date().toISOString() } },
          { status: 404 },
        ),
      ),
      http.get(`${base()}/patients/me/exists`, () => HttpResponse.json({ data: { exists: false } })),
    );

    renderDashboard(patientState);

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/en/journey'));
  });

  it('redirects an already-provisioned patient account to /patient (Overview) -- this route is a defensive fallback only, no longer nav-reachable', async () => {
    server.use(
      // The mock doctor store always has a seeded profile regardless of
      // caller -- an honest reflection of this account's real state would
      // 404, but combined with hasPatientProfile: true below, "neither
      // exists" is still false either way. hasPatientProfile is the fact
      // that actually matters for this account.
      http.get(`${base()}/patients/me/exists`, () => HttpResponse.json({ data: { exists: true } })),
    );

    renderDashboard(patientState);

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/en/patient'));
  });

  it('redirects a doctor-role account straight to /doctor (Overview), never rendering this generic page, and never calls the journey-status checks', async () => {
    let patientExistsCalled = false;
    server.use(
      http.get(`${base()}/patients/me/exists`, () => {
        patientExistsCalled = true;
        return HttpResponse.json({ data: { exists: true } });
      }),
    );

    renderDashboard(doctorState);

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/en/doctor'));
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(patientExistsCalled).toBe(false);
  });

  it('redirects a super_admin-role account straight to /admin (Overview), never rendering this generic page', async () => {
    renderDashboard(superAdminState);

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/en/admin'));
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).not.toBeInTheDocument();
  });
});
