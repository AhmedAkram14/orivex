import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { env } from '@/shared/lib/env';
import DoctorSchedulePage from './page';
import { server } from '@/mocks/server';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import { TooltipProvider } from '@/shared/ui/tooltip';
import enMessages from '../../../../../../messages/en.json';

// Doctor Reports page rebuild (Phase 2): a mutable `currentSearchParams`
// module-level variable, mirroring `messaging-workspace.test.tsx`'s own
// `?thread=` precedent -- lets individual tests below simulate arriving on
// this page with a `?status=` drill-down filter already in the URL.
let currentSearchParams = new URLSearchParams();
const routerReplace = vi.fn();
const routerPush = vi.fn();

// FullCalendar renders a full time grid in jsdom; under a parallel full-suite
// run the default 1000ms findBy window is too tight even though each test
// passes in ~1-2s alone (same timing-margin fix as the patient Overview test).
configure({ asyncUtilTimeout: 10000 });
vi.setConfig({ testTimeout: 30000 });

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/doctor/schedule',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => currentSearchParams,
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

vi.mock('@/shared/i18n/navigation', async () => {
  const actual = await vi.importActual<typeof import('@/shared/i18n/navigation')>('@/shared/i18n/navigation');
  return {
    ...actual,
    useRouter: () => ({ replace: routerReplace, push: routerPush }),
    usePathname: () => '/doctor/schedule',
  };
});

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  currentSearchParams = new URLSearchParams();
  routerReplace.mockClear();
  routerPush.mockClear();
});
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
    // This page's initial render does more work than most (availability +
    // schedule + rules queries, plus Phase 4's week-grid background blocks),
    // so `findByRole`'s default 1000ms polling window is tight under a
    // heavily parallel test run even though the component itself resolves
    // quickly in isolation -- same reasoning as the trend-chart test's own
    // explicit 10000ms window elsewhere in this suite.
    expect(await screen.findByRole('button', { name: 'Today' }, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous week' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next week' })).toBeInTheDocument();
  }, 15000);

  it('really navigates: Next week changes the visible range and Today returns to the current one', async () => {
    renderPage();
    const nav = await screen.findByRole('button', { name: 'Next week' });
    const rangeOf = () => nav.parentElement?.querySelector('[aria-live="polite"]')?.textContent ?? '';
    await waitFor(() => expect(rangeOf()).not.toBe(''));
    const initial = rangeOf();

    await userEvent.click(nav);
    await waitFor(() => expect(rangeOf()).not.toBe(initial));

    await userEvent.click(screen.getByRole('button', { name: 'Today' }));
    await waitFor(() => expect(rangeOf()).toBe(initial));
  });

  it('draws a real booked appointment as a calendar event that opens it in the Appointments view', async () => {
    const noon = new Date();
    noon.setHours(12, 0, 0, 0);
    // Sunday of this week keeps the appointment inside the visible week regardless of today's weekday.
    const inWeek = new Date(noon.getTime());
    server.use(
      http.get(`${env.apiBaseUrl}/appointments/doctor/schedule`, () =>
        HttpResponse.json({
          data: [
            {
              id: 'appt-calendar-1',
              patientId: 'p1',
              patientName: 'Nour Ahmed',
              scheduledAt: inWeek.toISOString(),
              endTime: new Date(inWeek.getTime() + 30 * 60_000).toISOString(),
              appointmentType: 'consultation',
              status: 'confirmed',
            },
          ],
        }),
      ),
    );
    renderPage();

    // jsdom has no layout, so FullCalendar leaves events `visibility: hidden` and
    // testing-library's role query skips them; assert the accessible label on the
    // element directly (real visibility is covered by the browser-level e2e spec).
    const eventSelector = '[role="button"][aria-label^="Appointment with Nour Ahmed"]';
    await waitFor(() => expect(document.querySelector(eventSelector)).not.toBeNull());
    expect(document.querySelector(eventSelector)).toHaveAttribute('aria-label', 'Appointment with Nour Ahmed at 12:00 PM');
    fireEvent.click(document.querySelector(eventSelector)!);
    expect(routerPush).toHaveBeenCalledWith('/doctor/appointments?highlight=appt-calendar-1');
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

  it('shows the working-hours editor dialog when Edit availability is clicked', async () => {
    renderPage();
    await screen.findByRole('button', { name: 'Today' });

    await userEvent.click(screen.getByRole('button', { name: 'Edit availability' }));
    expect(await screen.findByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('saves a working-hours change, reflects it in the read-only list, and closes the dialog', async () => {
    renderPage();
    await screen.findByRole('button', { name: 'Today' });

    await userEvent.click(screen.getByRole('button', { name: 'Edit availability' }));
    await userEvent.click(screen.getByRole('switch', { name: 'Monday working day' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    // The dialog closes on save.
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();

    // Back in the read-only list, Monday now shows as not working. The
    // "Monday" label and its status text are sibling groups within the same
    // row, so the shared ancestor is two levels up.
    const mondayLabel = await screen.findByText('Monday');
    const mondayRow = mondayLabel.closest('div')?.parentElement;
    expect(mondayRow).toHaveTextContent('Not available');
  });

  it('renders the honest-empty time-off table', async () => {
    renderPage();
    expect(await screen.findByText('No time off scheduled')).toBeInTheDocument();
  });

  it('adds and then removes a vacation date via the Add time off dialog', async () => {
    renderPage();
    await screen.findByText('No time off scheduled');

    await userEvent.click(screen.getByRole('button', { name: 'Add time off' }));
    fireEvent.change(await screen.findByLabelText('Date'), { target: { value: '2026-08-15' } });
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    // The dialog closes and the new row appears in the table.
    expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument();
    expect(screen.queryByText('No time off scheduled')).not.toBeInTheDocument();

    // The row-actions trigger's accessible name includes the row's own date
    // (`"Row actions for {date}"`) so it's unambiguous from the Weekly
    // Availability section's own per-weekday row-actions buttons on the
    // same page.
    await userEvent.click(screen.getByRole('button', { name: 'Row actions for Aug 15, 2026' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Remove time off' }));

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

  it('renders the This Week summary and Next Available Slot sidebar widgets', async () => {
    renderPage();
    await screen.findByRole('button', { name: 'Today' });

    expect(screen.getByText('This Week')).toBeInTheDocument();
    expect(screen.getByText('Working days')).toBeInTheDocument();
    expect(screen.getByText('Available hours')).toBeInTheDocument();
    expect(screen.getByText('Appointments')).toBeInTheDocument();
    expect(screen.getByText('Hours blocked')).toBeInTheDocument();
    expect(screen.getByText('Next Available Slot')).toBeInTheDocument();
  });

  // Doctor Reports page rebuild (Phase 2): the Schedule page's new
  // `?status=` URL-reading behavior and its "Clear filter" chip.
  it('shows no status-filter chip when the URL has no ?status=', async () => {
    renderPage();
    await screen.findByRole('button', { name: 'Today' });

    expect(screen.queryByText(/Filtered by:/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Clear filter/ })).not.toBeInTheDocument();
  });

  it('reads ?status= on mount and shows a "Filtered by" chip naming that status', async () => {
    currentSearchParams = new URLSearchParams({ status: 'confirmed' });
    renderPage();
    await screen.findByRole('button', { name: 'Today' });

    expect(screen.getByText('Filtered by: Confirmed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clear filter/ })).toBeInTheDocument();
  });

  it('clears the status filter and strips ?status= from the URL when Clear filter is clicked', async () => {
    currentSearchParams = new URLSearchParams({ status: 'no_show' });
    renderPage();
    await screen.findByRole('button', { name: 'Today' });

    expect(screen.getByText('Filtered by: No-show')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Clear filter/ }));

    expect(screen.queryByText(/Filtered by:/)).not.toBeInTheDocument();
    expect(routerReplace).toHaveBeenCalledWith('/doctor/schedule', { scroll: false });
  });
});
