import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import PatientMessagesPage from './page';
import { server } from '@/mocks/server';
import { LEGACY_PATIENT_ACCOUNT_ID } from '@/mocks/auth-store';
import { resetMessagingStore } from '@/mocks/messaging-store';
import { resetPatientStore, setPatientAppointments } from '@/mocks/patient-store';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import enMessages from '../../../../../../messages/en.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/patient/messages',
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
  resetMessagingStore();
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
          <PatientMessagesPage />
        </AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('PatientMessagesPage', () => {
  it('lets a patient start a conversation from an appointment, then send a message in it', async () => {
    seedOneAppointment();
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Dr. Omar Hassan')).toBeInTheDocument();
    expect(screen.getByText('No conversations yet.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Message' }));

    // The started thread now shows in the Conversations list (no longer a "new conversation" candidate).
    await waitFor(() => expect(screen.queryByText('No conversations yet.')).not.toBeInTheDocument());
    expect(screen.getByText('No messages yet')).toBeInTheDocument();

    const composer = screen.getByPlaceholderText('Write a message…');
    await user.type(composer, 'When should I take the medicine?');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('When should I take the medicine?')).toBeInTheDocument();
  });

  it('shows an honest empty state with no appointments and no conversations', async () => {
    renderPage();

    expect(await screen.findByText('Select a conversation')).toBeInTheDocument();
    expect(screen.getByText('No conversations yet.')).toBeInTheDocument();
    expect(screen.queryByText('Start a conversation')).not.toBeInTheDocument();
  });
});
