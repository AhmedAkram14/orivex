import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { JourneyScreen } from './journey-screen';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import { ThemeProvider } from '@/shared/providers/theme-provider';
import enMessages from '../../../../messages/en.json';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/journey',
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
  push.mockClear();
});
afterAll(() => server.close());

const authState: AuthState = {
  status: 'authenticated',
  user: { id: '1', email: 'patient@orivex.dev', fullName: 'Amina Youssef', roles: ['patient'] },
};

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <ThemeProvider>
          <AuthContext.Provider value={authState}>
            <JourneyScreen />
          </AuthContext.Provider>
        </ThemeProvider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('JourneyScreen', () => {
  it('renders both journey cards, its own header (no dashboard sidebar), and no fabricated trust claims', () => {
    renderScreen();

    expect(screen.getByRole('heading', { name: "I'm a Patient" })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: "I'm a Doctor" })).toBeInTheDocument();
    // This screen owns its own minimal header (logo, help link, account
    // menu) rather than the dashboard AppShell's sidebar/topbar -- there is
    // nothing to navigate to yet (no DoctorProfile/PatientProfile exists).
    expect(screen.getByText('Orivex')).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    // Regression guard: no unbacked claim like "HIPAA Compliant" or
    // "Trusted by thousands" -- see this file's own honesty rule.
    expect(screen.queryByText(/HIPAA/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/thousands/i)).not.toBeInTheDocument();
  });

  it('creates the patient profile and navigates to /patient/intake when "Continue as a Patient" is chosen', async () => {
    let createCalled = false;
    server.use(
      http.get(`${base()}/patients/me`, () => {
        createCalled = true;
        return HttpResponse.json({
          data: { id: 'patient-profile-1', fullName: 'Amina Youssef', email: 'patient@orivex.dev', emergencyContacts: [] },
        });
      }),
    );

    renderScreen();
    await userEvent.click(screen.getByRole('button', { name: 'Continue as a Patient' }));

    expect(await screen.findByRole('button', { name: 'Continue as a Patient' })).toBeEnabled();
    expect(createCalled).toBe(true);
    expect(push).toHaveBeenCalledWith('/en/patient/intake');
  });

  it('navigates straight to /doctor/onboarding when "Apply as a Doctor" is chosen, without touching the patient endpoint', async () => {
    let patientEndpointCalled = false;
    server.use(
      http.get(`${base()}/patients/me`, () => {
        patientEndpointCalled = true;
        return HttpResponse.json({ data: {} });
      }),
    );

    renderScreen();
    await userEvent.click(screen.getByRole('button', { name: 'Apply as a Doctor' }));

    expect(push).toHaveBeenCalledWith('/en/doctor/onboarding');
    expect(patientEndpointCalled).toBe(false);
  });
});
