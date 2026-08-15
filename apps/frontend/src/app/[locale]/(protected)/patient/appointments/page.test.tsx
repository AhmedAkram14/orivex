import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import PatientAppointmentsPage from './page';
import { server } from '@/mocks/server';
import { bookAppointment, resetPatientStore } from '@/mocks/patient-store';
import { addDoctorException, resetSchedulingStore } from '@/mocks/scheduling-store';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import enMessages from '../../../../../../messages/en.json';

const DOCTOR_ID = 'doctor-profile-1';

/** Matches `resolve-day.ts`'s own local-date `toDateKey` format exactly. */
function todayDateKey(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/patient/appointments',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetPatientStore();
  resetSchedulingStore();
});
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
          <PatientAppointmentsPage />
        </AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('PatientAppointmentsPage', () => {
  it('renders the calendar foundation and an honest empty upcoming-appointments state', async () => {
    renderPage();

    expect(await screen.findByText('Calendar')).toBeInTheDocument();
    expect(await screen.findByText('No upcoming appointments')).toBeInTheDocument();
  });

  it('renders a link to the booking flow', async () => {
    renderPage();
    await screen.findByText('No upcoming appointments');

    expect(screen.getByRole('link', { name: 'Book appointment' })).toHaveAttribute(
      'href',
      '/en/patient/appointments/book',
    );
  });

  it('switches to the History tab and shows its own empty state with filters', async () => {
    renderPage();
    await screen.findByText('No upcoming appointments');

    await userEvent.click(screen.getByRole('tab', { name: 'History' }));

    expect(await screen.findByText('No appointment history yet')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Completed' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Cancelled' })).toBeInTheDocument();
  });

  // Patient-Facing Reschedule (Phase 3 Step 2): end-to-end through the real
  // page (not just the isolated component) -- a real Requested appointment
  // in the Upcoming tab has a reachable Reschedule action that opens the
  // real slot-picker flow for the same doctor.
  it('opens the real reschedule flow from a Requested appointment on the Upcoming tab', async () => {
    addDoctorException({ date: todayDateKey(), type: 'extra-hours', hours: { start: '00:00', end: '23:30' } });
    bookAppointment({ doctorId: DOCTOR_ID, availabilityWindowId: `${DOCTOR_ID}::2026-01-05T10:00:00.000Z` });
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Reschedule' }));

    expect(await screen.findByText('Reschedule appointment')).toBeInTheDocument();
  });
});
