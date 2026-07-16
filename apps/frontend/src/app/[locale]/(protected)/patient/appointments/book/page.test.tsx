import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import BookAppointmentPage from './page';
import { server } from '@/mocks/server';
import { resetSchedulingStore } from '@/mocks/scheduling-store';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import { TooltipProvider } from '@/shared/ui/tooltip';
import enMessages from '../../../../../../../messages/en.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/patient/appointments/book',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

beforeEach(() => {
  // A Monday at 7am -- before the seeded doctor's 9-5 working hours, so
  // today's slots are real and available rather than depending on
  // whichever day the test suite happens to run on.
  vi.setSystemTime(new Date(2026, 6, 13, 7, 0, 0, 0));
});

afterEach(() => {
  server.resetHandlers();
  resetSchedulingStore();
  vi.useRealTimers();
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
        <TooltipProvider delayDuration={200}>
          <AuthContext.Provider value={patientState}>
            <BookAppointmentPage />
          </AuthContext.Provider>
        </TooltipProvider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

async function selectFirstAvailableSlot() {
  const availableButtons = await screen.findAllByRole('button', { name: /AM|PM/ });
  await userEvent.click(availableButtons[0]);
  return availableButtons[0].textContent;
}

describe('BookAppointmentPage', () => {
  it('shows the available-slots grid for a working day', async () => {
    renderPage();
    expect(await screen.findByRole('button', { name: /9:00 AM/ })).toBeInTheDocument();
  });

  it('walks through select -> summary -> confirm and shows the confirmed booking', async () => {
    renderPage();
    const slotTime = await selectFirstAvailableSlot();

    expect(await screen.findByText('Review')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm booking' }));

    expect(await screen.findByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reschedule' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(slotTime).toBeTruthy();
  });

  it('cancels a confirmed booking after confirming the dialog', async () => {
    renderPage();
    await selectFirstAvailableSlot();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm booking' }));
    await screen.findByText('Confirmed');

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel booking' }));

    // Back to slot selection once cancelled.
    expect(await screen.findByRole('button', { name: /9:00 AM/ })).toBeInTheDocument();
  });

  it('returns to slot selection when Reschedule is clicked', async () => {
    renderPage();
    await selectFirstAvailableSlot();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm booking' }));
    await screen.findByText('Confirmed');

    await userEvent.click(screen.getByRole('button', { name: 'Reschedule' }));

    expect(await screen.findAllByRole('button', { name: /AM|PM/ })).not.toHaveLength(0);
  });

  it('excludes slots inside the minimum-notice window (Scheduling Rules, Milestone 6)', async () => {
    // 8:45am -- the seeded 60-minute minimum notice pushes the deadline to
    // 9:45am, so both the 9:00 and 9:40 slots fail it; 10:20 is the first
    // real, bookable slot.
    vi.setSystemTime(new Date(2026, 6, 13, 8, 45, 0, 0));
    renderPage();

    expect(await screen.findByRole('button', { name: /10:20 AM/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /9:00 AM/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /9:40 AM/ })).not.toBeInTheDocument();
  });
});
