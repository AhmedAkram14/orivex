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
let search = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/journey',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(search),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

const base = () => env.apiBaseUrl;

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  push.mockClear();
  search = '';
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

const continueButton = () => screen.getByRole('button', { name: /^Continue/ });

describe('JourneyScreen', () => {
  it('offers two equal radio cards and one Continue button, disabled until a choice is made', () => {
    renderScreen();

    const group = screen.getByRole('radiogroup', { name: 'How will you use ORIVEX?' });
    expect(group).toBeInTheDocument();
    const patient = screen.getByRole('radio', { name: "I'm a patient" });
    const doctor = screen.getByRole('radio', { name: "I'm a doctor" });
    expect(patient).toHaveAttribute('aria-checked', 'false');
    expect(doctor).toHaveAttribute('aria-checked', 'false');
    // One tab stop for the whole group.
    expect(patient).toHaveAttribute('tabindex', '0');
    expect(doctor).toHaveAttribute('tabindex', '-1');
    expect(continueButton()).toBeDisabled();
    expect(continueButton()).toHaveTextContent('Continue');

    expect(screen.getByText('Welcome, Amina')).toBeInTheDocument();
    // Its own header (logo, help link, account menu), not the dashboard AppShell.
    expect(screen.getByText('Orivex')).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    // Honest copy: no "switch roles anytime" (doctor status needs an application and review), no unbacked claims.
    expect(screen.queryByText(/switch roles/i)).not.toBeInTheDocument();
    expect(screen.getByText(/apply as a doctor later from your account menu/)).toBeInTheDocument();
    expect(screen.getByText('Requires license verification: 4 steps, then a review by our team.')).toBeInTheDocument();
    expect(screen.queryByText(/HIPAA/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/thousands/i)).not.toBeInTheDocument();
    // Exactly three benefits a card.
    expect(patient.querySelectorAll('li')).toHaveLength(3);
    expect(doctor.querySelectorAll('li')).toHaveLength(3);
  });

  it('as a patient: creates the patient profile and goes to /patient/intake, same as the old "Continue as a Patient"', async () => {
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
    await userEvent.click(screen.getByRole('radio', { name: "I'm a patient" }));
    expect(screen.getByRole('radio', { name: "I'm a patient" })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Continue as a patient' }));

    expect(await screen.findByRole('button', { name: 'Continue as a patient' })).toBeEnabled();
    expect(createCalled).toBe(true);
    expect(push).toHaveBeenCalledWith('/en/patient/intake');
  });

  it('as a doctor: goes straight to /doctor/onboarding without touching the patient endpoint, same as the old "Apply as a Doctor"', async () => {
    let patientEndpointCalled = false;
    server.use(
      http.get(`${base()}/patients/me`, () => {
        patientEndpointCalled = true;
        return HttpResponse.json({ data: {} });
      }),
    );

    renderScreen();
    await userEvent.click(screen.getByRole('radio', { name: "I'm a doctor" }));
    await userEvent.click(screen.getByRole('button', { name: 'Continue as a doctor' }));

    expect(push).toHaveBeenCalledWith('/en/doctor/onboarding');
    expect(patientEndpointCalled).toBe(false);
  });

  it('keyboard: arrows move between the cards without choosing, Space chooses, the tab stop follows focus', async () => {
    const user = userEvent.setup();
    renderScreen();
    const patient = screen.getByRole('radio', { name: "I'm a patient" });
    const doctor = screen.getByRole('radio', { name: "I'm a doctor" });

    patient.focus();
    await user.keyboard('{ArrowRight}');
    expect(doctor).toHaveFocus();
    expect(doctor).toHaveAttribute('aria-checked', 'false');
    expect(doctor).toHaveAttribute('tabindex', '0');
    expect(patient).toHaveAttribute('tabindex', '-1');

    await user.keyboard(' ');
    expect(doctor).toHaveAttribute('aria-checked', 'true');
    expect(continueButton()).toHaveTextContent('Continue as a doctor');

    await user.keyboard('{ArrowLeft}');
    expect(patient).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(patient).toHaveAttribute('aria-checked', 'true');
    expect(doctor).toHaveAttribute('aria-checked', 'false');
    expect(continueButton()).toHaveTextContent('Continue as a patient');
    expect(push).not.toHaveBeenCalled();
  });

  it('arriving with ?intent=doctor pre-selects the doctor card but never submits it', () => {
    search = 'intent=doctor';
    renderScreen();

    expect(screen.getByRole('radio', { name: "I'm a doctor" })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: "I'm a doctor" })).toHaveAttribute('tabindex', '0');
    expect(continueButton()).toBeEnabled();
    expect(continueButton()).toHaveTextContent('Continue as a doctor');
    expect(push).not.toHaveBeenCalled();
  });
});
