import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import PatientAppointmentsPage from './page';
import { server } from '@/mocks/server';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import enMessages from '../../../../../../messages/en.json';

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

  it('switches to the History tab and shows its own empty state with filters', async () => {
    renderPage();
    await screen.findByText('No upcoming appointments');

    await userEvent.click(screen.getByRole('tab', { name: 'History' }));

    expect(await screen.findByText('No appointment history yet')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Completed' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Cancelled' })).toBeInTheDocument();
  });
});
