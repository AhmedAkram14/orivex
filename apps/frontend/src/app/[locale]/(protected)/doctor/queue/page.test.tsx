import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import DoctorQueuePage from './page';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import enMessages from '../../../../../../messages/en.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/doctor/queue',
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

describe('DoctorQueuePage', () => {
  it('shows honest empty states for both the current patient and the waiting queue', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
          <AuthContext.Provider value={doctorState}>
            <DoctorQueuePage />
          </AuthContext.Provider>
        </NextIntlClientProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('No one in consultation')).toBeInTheDocument();
    expect(screen.getByText('No one waiting')).toBeInTheDocument();
  });

  it('offers both Join video call and Consultation workspace for the current in-consultation patient', async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/appointments/doctor/queue`, () =>
        HttpResponse.json({
          data: [
            { id: 'session-1', label: 'Amina Youssef', status: 'in-consultation', position: 0 },
          ],
        }),
      ),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
          <AuthContext.Provider value={doctorState}>
            <DoctorQueuePage />
          </AuthContext.Provider>
        </NextIntlClientProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('button', { name: 'Join video call' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Consultation workspace' })).toBeInTheDocument();
  });
});
