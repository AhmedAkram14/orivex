import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

    expect(screen.getByText('All consultations are secure and confidential.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Queue settings/ })).toHaveAttribute(
      'href',
      expect.stringContaining('/doctor/schedule'),
    );

    // Real zero-count stats derived from the (empty) queue + pending-approval
    // responses -- "Waiting"/"In consultation" also label the filter tabs
    // above, so these assert both instances exist rather than risking an
    // ambiguous single-match query.
    expect(screen.getAllByText('Waiting').length).toBe(2);
    expect(screen.getAllByText('In consultation').length).toBe(2);
    expect(screen.getByText('Completed today')).toBeInTheDocument();
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

  // Doctor-approval-workflow fix: every booking (Free or Paid) now lands
  // Requested and waits in this section until the doctor approves it.
  it('lists a pending appointment request and lets the doctor approve it', async () => {
    let approveCallCount = 0;
    server.use(
      http.get(`${env.apiBaseUrl}/appointments/doctor/pending-approval`, () =>
        HttpResponse.json({
          data: [
            {
              id: 'appointment-1',
              patientName: 'Amina Youssef',
              scheduledAt: new Date().toISOString(),
              reasonForVisit: 'Routine check-up',
              consultationType: 'free',
            },
          ],
        }),
      ),
      http.patch(`${env.apiBaseUrl}/appointments/:id/approve`, ({ params }) => {
        approveCallCount += 1;
        return HttpResponse.json({ data: { id: params.id, status: 'confirmed' } });
      }),
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

    expect(await screen.findByText('Amina Youssef')).toBeInTheDocument();
    expect(screen.getByText('Routine check-up')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(approveCallCount).toBe(1));
  });

  it('shows an honest empty state when there are no pending requests', async () => {
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

    // Appears twice now: the pending-approval section's own empty state,
    // and the stats row's "Pending approval" card sublabel (both honestly
    // describing the same real zero count).
    expect((await screen.findAllByText('No requests waiting')).length).toBe(2);
  });
});
