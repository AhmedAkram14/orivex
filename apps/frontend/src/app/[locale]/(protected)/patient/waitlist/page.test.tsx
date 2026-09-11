import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import PatientWaitlistPage from './page';
import { server } from '@/mocks/server';
import { LEGACY_PATIENT_ACCOUNT_ID } from '@/mocks/auth-store';
import { resetWaitlistStore } from '@/mocks/waitlist-store';
import { resetPatientStore, setPatientAppointments } from '@/mocks/patient-store';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import enMessages from '../../../../../../messages/en.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/patient/waitlist',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const patientState: AuthState = {
  status: 'authenticated',
  user: { id: LEGACY_PATIENT_ACCOUNT_ID, email: 'patient@orivex.dev', fullName: 'Amina Youssef', roles: ['patient'] },
};

afterEach(() => {
  resetPatientStore();
  resetWaitlistStore();
});

function seedOneAppointment() {
  setPatientAppointments(LEGACY_PATIENT_ACCOUNT_ID, [
    {
      id: 'appointment-1',
      scheduledAt: new Date().toISOString(),
      doctorId: 'doctor-profile-1',
      doctorName: 'Dr. Omar Hassan',
      specialization: 'Cardiology',
      specializationAr: null,
      status: 'completed',
      consultationType: 'paid',
      consultationSessionId: null,
      paymentRequired: false,
      feeAmount: null,
    },
  ]);
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <AuthContext.Provider value={patientState}>
          <PatientWaitlistPage />
        </AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('PatientWaitlistPage', () => {
  it('joins the waitlist for a real doctor and shows it in the list', async () => {
    seedOneAppointment();
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('No waitlist entries')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Join a waitlist' }));
    await user.click(screen.getByRole('combobox', { name: 'Doctor' }));
    await user.click(await screen.findByText('Dr. Omar Hassan'));
    const latestInput = screen.getByLabelText('Latest date');
    const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await user.type(latestInput, futureDate);
    await user.click(screen.getByRole('button', { name: 'Join waitlist' }));

    await waitFor(() => expect(screen.queryByText('No waitlist entries')).not.toBeInTheDocument());
    expect(screen.getByText('Dr. Omar Hassan')).toBeInTheDocument();
    expect(screen.getByText('Waiting')).toBeInTheDocument();
  });

  it('cancels an entry, moving it out of the active list action', async () => {
    seedOneAppointment();
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('No waitlist entries');
    await user.click(screen.getByRole('button', { name: 'Join a waitlist' }));
    await user.click(screen.getByRole('combobox', { name: 'Doctor' }));
    await user.click(await screen.findByText('Dr. Omar Hassan'));
    const latestInput = screen.getByLabelText('Latest date');
    const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await user.type(latestInput, futureDate);
    await user.click(screen.getByRole('button', { name: 'Join waitlist' }));
    await screen.findByText('Waiting');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.getByText('Cancelled')).toBeInTheDocument());
  });
});
