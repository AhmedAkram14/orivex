import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import PatientDisputesPage from './page';
import { server } from '@/mocks/server';
import { LEGACY_PATIENT_ACCOUNT_ID } from '@/mocks/auth-store';
import { resetDisputesStore } from '@/mocks/disputes-store';
import { resetPatientStore, setPatientAppointments } from '@/mocks/patient-store';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import enMessages from '../../../../../../messages/en.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/patient/disputes',
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
  resetDisputesStore();
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
          <PatientDisputesPage />
        </AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('PatientDisputesPage', () => {
  it('raises a dispute against a real appointment and shows it in the list', async () => {
    seedOneAppointment();
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('No disputes raised')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Raise a dispute' }));
    await user.click(screen.getByRole('combobox', { name: 'Appointment' }));
    await user.click(await screen.findByText(/Dr. Omar Hassan/));
    await user.type(screen.getByPlaceholderText('Describe the issue'), 'The doctor never joined the call.');
    await user.click(screen.getByRole('button', { name: 'Raise dispute' }));

    await waitFor(() => expect(screen.queryByText('No disputes raised')).not.toBeInTheDocument());
    expect(screen.getByText('The doctor never joined the call.')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
  });
});
