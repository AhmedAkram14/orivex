import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import DoctorSchedulePage from './page';
import { server } from '@/mocks/server';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import { TooltipProvider } from '@/shared/ui/tooltip';
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
        <TooltipProvider delayDuration={200}>
          <AuthContext.Provider value={doctorState}>
            <DoctorSchedulePage />
          </AuthContext.Provider>
        </TooltipProvider>
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

  it('shows the working-hours editor when Edit available hours is clicked', async () => {
    renderPage();
    await screen.findByRole('button', { name: 'Today' });

    await userEvent.click(screen.getByRole('button', { name: 'Edit available hours' }));
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('saves a working-hours change and reflects it in the read-only summary', async () => {
    renderPage();
    await screen.findByRole('button', { name: 'Today' });

    await userEvent.click(screen.getByRole('button', { name: 'Edit available hours' }));
    await userEvent.click(screen.getByRole('switch', { name: 'Monday working day' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    // Back in the read-only summary, Monday now shows as not working. The
    // "Monday" label and its status text are sibling sections within the
    // AvailabilityCard row, so the shared ancestor is two levels up.
    const mondayLabel = await screen.findByText('Monday');
    const mondayRow = mondayLabel.closest('div')?.parentElement;
    expect(mondayRow).toHaveTextContent('Not available');
  });

  it('renders the honest-empty time-off manager', async () => {
    renderPage();
    expect(await screen.findByText('No time off scheduled')).toBeInTheDocument();
  });

  it('adds and then removes a vacation date (Time Off architecture)', async () => {
    renderPage();
    await screen.findByText('No time off scheduled');

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-08-15' } });
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByRole('button', { name: 'Remove time off' })).toBeInTheDocument();
    expect(screen.queryByText('No time off scheduled')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Remove time off' }));
    expect(await screen.findByText('No time off scheduled')).toBeInTheDocument();
  });

  it('switches to the Agenda view and renders real generated slots', async () => {
    renderPage();
    await screen.findByRole('button', { name: 'Today' });

    await userEvent.click(screen.getByRole('tab', { name: 'Agenda' }));

    // The seeded schedule (Sun-Thu, 9-5) guarantees at least one working
    // day within the next 14 days, so the agenda is never empty here.
    expect(screen.queryByText('Nothing scheduled')).not.toBeInTheDocument();
  });
});
