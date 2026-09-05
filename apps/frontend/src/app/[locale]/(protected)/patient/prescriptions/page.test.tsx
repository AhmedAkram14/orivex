import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import PatientPrescriptionsPage from './page';
import { server } from '@/mocks/server';
import { LEGACY_PATIENT_ACCOUNT_ID } from '@/mocks/auth-store';
import { resetPatientStore, setPatientDashboardState } from '@/mocks/patient-store';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import enMessages from '../../../../../../messages/en.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/patient/prescriptions',
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
  user: { id: '1', email: 'patient@orivex.dev', fullName: 'Amina Youssef', roles: ['patient'] },
};

beforeEach(() => {
  window.print = vi.fn();
});

afterEach(() => {
  resetPatientStore();
});

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <AuthContext.Provider value={patientState}>
          <PatientPrescriptionsPage />
        </AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('PatientPrescriptionsPage', () => {
  it('shows an honest empty state with real next-step actions for both tabs', async () => {
    renderPage();

    expect(await screen.findByText('No active prescriptions')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse Doctors' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Book Appointment' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Previous' }));
    expect(await screen.findByText('No previous prescriptions')).toBeInTheDocument();
  });

  it('renders the Active/Previous tabs', async () => {
    renderPage();
    await screen.findByText('No active prescriptions');

    expect(screen.getByRole('tab', { name: 'Active' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Previous' })).toBeInTheDocument();
  });

  it('renders real prescription data with KPI counts and status badges', async () => {
    setPatientDashboardState(LEGACY_PATIENT_ACCOUNT_ID, {
      prescriptions: [
        {
          id: 'rx-1',
          medicationName: 'Sertraline',
          dosageAmount: '50mg',
          frequencyLabel: 'Once daily',
          prescribedBy: 'Dr. Ahmed Khaled',
          prescribedAt: '2026-08-30T00:00:00.000Z',
          status: 'active',
          instructions: 'Take with food',
        },
        {
          id: 'rx-2',
          medicationName: 'Amoxicillin',
          dosageAmount: '500mg',
          frequencyLabel: 'Every 8 hours',
          prescribedBy: 'Dr. Amr Ezzat',
          prescribedAt: '2026-07-10T00:00:00.000Z',
          status: 'expired',
        },
      ],
    });

    renderPage();

    expect(await screen.findByText('Sertraline 50mg')).toBeInTheDocument();
    expect(screen.getByText('Take with food')).toBeInTheDocument();

    // KPI row: 1 active prescription, 2 total (sublabels are unique to each tile, unlike the labels which are shared with the section headings below).
    const activeTile = screen.getByText('Currently taking').closest('div');
    const totalTile = screen.getByText('All time').closest('div');
    expect(activeTile).toHaveTextContent('1');
    expect(totalTile).toHaveTextContent('2');

    await userEvent.click(screen.getByRole('tab', { name: 'Previous' }));
    expect(await screen.findByText('Amoxicillin 500mg')).toBeInTheDocument();
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('triggers the browser print dialog from the Print list action', async () => {
    renderPage();
    await screen.findByText('No active prescriptions');

    await userEvent.click(screen.getByRole('button', { name: 'Print list' }));
    expect(window.print).toHaveBeenCalledTimes(1);
  });
});
