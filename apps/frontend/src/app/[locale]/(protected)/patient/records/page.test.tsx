import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import PatientMedicalRecordsPage from './page';
import { server } from '@/mocks/server';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import enMessages from '../../../../../../messages/en.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/patient/records',
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

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <AuthContext.Provider value={patientState}>
          <PatientMedicalRecordsPage />
        </AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('PatientMedicalRecordsPage', () => {
  it('shows an honest empty timeline and the lab/imaging placeholders', async () => {
    renderPage();

    expect(await screen.findByText('No medical records yet')).toBeInTheDocument();
    expect(screen.getByText("Lab results aren't available yet")).toBeInTheDocument();
    expect(screen.getByText("Imaging isn't available yet")).toBeInTheDocument();
  });

  it('renders the type filter tabs', async () => {
    renderPage();
    await screen.findByText('No medical records yet');

    expect(screen.getByRole('tab', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Visits' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Diagnoses' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Allergies' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Conditions' })).toBeInTheDocument();
  });
});
