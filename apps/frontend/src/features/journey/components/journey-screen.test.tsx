import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { JourneyScreen } from './journey-screen';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';
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

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <JourneyScreen />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('JourneyScreen', () => {
  it('renders both journey cards', () => {
    renderScreen();

    expect(screen.getByRole('heading', { name: 'Book appointments' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Practice as a Doctor' })).toBeInTheDocument();
  });

  it('creates the patient profile and navigates to /patient when "Continue as a patient" is chosen', async () => {
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
    await userEvent.click(screen.getByRole('button', { name: 'Continue as a patient' }));

    expect(await screen.findByRole('button', { name: 'Continue as a patient' })).toBeEnabled();
    expect(createCalled).toBe(true);
    expect(push).toHaveBeenCalledWith('/en/patient');
  });

  it('navigates straight to /doctor/onboarding when "Apply as a doctor" is chosen, without touching the patient endpoint', async () => {
    let patientEndpointCalled = false;
    server.use(
      http.get(`${base()}/patients/me`, () => {
        patientEndpointCalled = true;
        return HttpResponse.json({ data: {} });
      }),
    );

    renderScreen();
    await userEvent.click(screen.getByRole('button', { name: 'Apply as a doctor' }));

    expect(push).toHaveBeenCalledWith('/en/doctor/onboarding');
    expect(patientEndpointCalled).toBe(false);
  });
});
