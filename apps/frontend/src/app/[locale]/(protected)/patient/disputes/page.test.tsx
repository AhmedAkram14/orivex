import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
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
    const user = userEvent.setup({ delay: null });
    renderPage();

    expect(await screen.findByText('No disputes raised')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Raise a dispute' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('combobox', { name: 'Appointment' }));
    // `getByRole('option', ...)` (not `getByText`) -- Radix Select also
    // mirrors its items into a hidden native `<select>` for form semantics,
    // and `getByText` matches that hidden option's text too (ambiguous
    // "multiple elements" match), while role queries correctly exclude it.
    await user.click(await screen.findByRole('option', { name: /Dr\. Omar Hassan/ }));
    // Dispute System Hardening Phase 3: category and the acknowledgment
    // checkbox are now required before the submit button enables, and the
    // minimum reason length is 30 chars (the string below already clears it).
    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    await user.click(await screen.findByRole('option', { name: 'No-show' }));
    await user.type(screen.getByPlaceholderText('Describe the issue'), 'The doctor never joined the call at all.');
    await user.click(screen.getByLabelText('I confirm this report is accurate and understand it will be reviewed by an admin.'));
    await user.click(screen.getByRole('button', { name: 'Raise dispute' }));

    await waitFor(() => expect(screen.queryByText('No disputes raised')).not.toBeInTheDocument());
    expect(screen.getByText(/The doctor never joined the call at all\./)).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
  }, 15000);
});
