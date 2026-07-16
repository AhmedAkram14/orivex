import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import DoctorSchedulePage from './page';
import { server } from '@/mocks/server';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import enMessages from '../../../../../../messages/en.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/doctor/schedule',
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

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <AuthContext.Provider value={doctorState}>
          <DoctorSchedulePage />
        </AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('DoctorSchedulePage', () => {
  it('renders the weekly calendar and the previous/today/next controls', async () => {
    renderPage();
    expect(await screen.findByRole('button', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous week' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next week' })).toBeInTheDocument();
  });

  it('navigates to the next week without crashing when Next week is clicked', async () => {
    renderPage();
    await screen.findByRole('button', { name: 'Today' });

    await userEvent.click(screen.getByRole('button', { name: 'Next week' }));

    // Still renders a valid week grid after navigating -- the real
    // assertion is that this doesn't throw (date math stays in range).
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
  });

  it('switches to the Month view and back to Week without crashing', async () => {
    renderPage();
    await screen.findByRole('button', { name: 'Today' });

    await userEvent.click(screen.getByRole('tab', { name: 'Month' }));
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Week' }));
    expect(screen.getByRole('button', { name: 'Previous week' })).toBeInTheDocument();
  });

  it('switches to the Day view without crashing', async () => {
    renderPage();
    await screen.findByRole('button', { name: 'Today' });

    await userEvent.click(screen.getByRole('tab', { name: 'Day' }));

    // The Day panel has no week navigation of its own -- confirms the tab
    // actually switched rather than silently staying on Week.
    expect(screen.queryByRole('button', { name: 'Previous week' })).not.toBeInTheDocument();
  });

  it('shows the working-hours editor when Edit working hours is clicked', async () => {
    renderPage();
    await screen.findByRole('button', { name: 'Today' });

    await userEvent.click(screen.getByRole('button', { name: 'Edit working hours' }));
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('renders the honest-empty time-off manager', async () => {
    renderPage();
    expect(await screen.findByText('No time off scheduled')).toBeInTheDocument();
  });
});
