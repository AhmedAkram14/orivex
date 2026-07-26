import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import BookAppointmentPage from './page';
import { server } from '@/mocks/server';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import enMessages from '../../../../../../../messages/en.json';

const useSearchParamsMock = vi.fn(() => new URLSearchParams());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/patient/appointments/book',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => useSearchParamsMock(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  useSearchParamsMock.mockReturnValue(new URLSearchParams());
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
          <BookAppointmentPage />
        </AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('BookAppointmentPage', () => {
  it('shows an honest "no doctor selected" state when reached without a doctorId', () => {
    renderPage();

    expect(screen.getByText('No doctor selected')).toBeInTheDocument();
    expect(
      screen.getByText('Start from a doctor\'s profile and select "Book appointment" to book a real appointment with them.'),
    ).toBeInTheDocument();
  });

  it('renders the real BookingFlow when a doctorId is present', async () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams({ doctorId: 'doctor-profile-1' }));

    renderPage();

    expect(await screen.findByRole('button', { name: 'Today' })).toBeInTheDocument();
    expect(screen.queryByText('No doctor selected')).not.toBeInTheDocument();
  });
});
