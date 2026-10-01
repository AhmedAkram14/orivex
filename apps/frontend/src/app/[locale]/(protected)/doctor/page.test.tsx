import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import DoctorDashboardPage from './page';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';
import { DOCTOR_PATHS } from '@/features/doctor/api/paths';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import enMessages from '../../../../../messages/en.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/doctor',
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
          <DoctorDashboardPage />
        </AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('DoctorDashboardPage', () => {
  it('renders the welcome message and today\'s seeded busy schedule', async () => {
    renderPage();

    // Phase 8: the greeting's name is now wrapped in a `<bdi>` element (bidi
    // isolation fix for the Arabic locale's embedded-LTR-name punctuation
    // bug -- see `welcome-header.tsx`), so the sentence is split across
    // sibling text nodes and no single node's own text is the full exact
    // string anymore -- assert on the heading's combined `textContent`
    // instead of an exact-string `getByText`/accessible-name match.
    const heading = await screen.findByRole('heading', { level: 1 });
    expect(heading.textContent).toBe('Welcome back, Dr. Sarah Ahmed.');
    // `doctor-store.ts`'s seeded busy-practice-day fixture (not a real
    // clinical record). Upcoming work shows at most three rows -- the visit in
    // progress (Nourhan, "Go to queue") and what follows -- and links to the
    // rest; the morning's completed visits (e.g. Mona Farouk) are behind
    // "View all".
    const goToQueue = await screen.findByRole('link', { name: 'Go to queue' });
    const upcomingWork = goToQueue.closest('ul')!;
    expect(within(upcomingWork).getAllByRole('listitem').length).toBeLessThanOrEqual(3);
    expect(within(upcomingWork).getByText('Nourhan Abdel Aziz')).toBeInTheDocument();
    expect(screen.queryByText('Mona Farouk')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^View all \(\d+\)$/ })).toHaveAttribute('href', '/en/doctor/appointments');
  });

  it('renders the redesigned hero, quick actions, and a real startable consultation', async () => {
    renderPage();

    // The seeded queue has a real `waiting` entry, so the hero renders a
    // live Start Consultation action rather than the disabled fallback.
    expect(await screen.findByRole('button', { name: 'Start consultation' })).toBeInTheDocument();
    expect(
      await screen.findByText((_, element) => (element?.textContent ?? '').includes('consultations today'), {
        selector: 'p',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View Patient Queue/ })).toBeInTheDocument();
    // The two everyday actions are buttons; the rest sit in one ⋯ menu so the row never wraps.
    expect(screen.queryByRole('link', { name: /Update Schedule/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
    const menu = await screen.findByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: /Update Schedule/ })).toHaveAttribute('href', '/en/doctor/schedule');
    // Unavailable, but still focusable, with its reason for screen readers (and a tooltip on hover/focus).
    const writePrescription = within(menu).getByRole('menuitem', { name: /Write Prescription/ });
    expect(writePrescription).toHaveAttribute('aria-disabled', 'true');
    expect(writePrescription).toHaveTextContent('Prescriptions are written during a consultation');
    // Doctor Profile Redesign (2026-08-02): `consultation-store.ts` now
    // seeds a few real reviews for this doctor (previously always empty) --
    // the hero's "Today's Summary" rating stat reflects that real average
    // (4.67 -> "4.7"), never a fabricated figure.
    // Three reviews is below the confidence threshold, so the rating stat reads "New — 3 ratings" instead of a number.
    expect((await screen.findAllByText('New — 3 ratings')).length).toBeGreaterThan(0);
  });

  it('renders the bottom widget row: Today\'s Progress (matching the seeded completed/consultations counts), Upcoming Availability, and Recent Activity', async () => {
    renderPage();

    // completedToday: 4, consultationsToday (still-pending): 7 -- total for
    // the ring is completed + still-pending (11), since `consultationsToday`
    // is deliberately pending-only, not the day's total. See
    // `doctor-store.ts`'s `seedSummary()`/`seedUpcomingWork()`.
    expect(await screen.findByText('4 of 11 done')).toBeInTheDocument();
    expect(screen.getByText("Today's Progress")).toBeInTheDocument();
    expect(screen.getByText('Upcoming Availability')).toBeInTheDocument();
    // The seeded mock notification store is never empty (3 real seed
    // entries), so Recent Activity's honest-empty-state is covered
    // separately by a dedicated MSW override below rather than asserted here.
    expect(await screen.findByText('Welcome to Orivex')).toBeInTheDocument();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  it('still renders the honest empty state when a real doctor genuinely has nothing scheduled today', async () => {
    // Overrides just the upcoming-work endpoint back to an honest `[]` for
    // this one test -- proving the real empty-state rendering path (distinct
    // from the busy demo seed above) still works, per this redesign's own
    // "no fabrication" mandate.
    server.use(
      http.get(`${env.apiBaseUrl}${DOCTOR_PATHS.upcomingWork}`, () => HttpResponse.json({ data: [] })),
    );

    renderPage();

    // Nothing booked is said once, in one "Today" card that stands in for Upcoming work and Today's Progress -- not
    // as a line in each card, and never as a second illustrated empty state.
    expect(await screen.findByText('Nothing booked')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Today$/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Upcoming work' })).not.toBeInTheDocument();
    expect(screen.queryByText('Nothing booked for today.')).not.toBeInTheDocument();
    expect(screen.queryByText('No appointments scheduled today. Enjoy your free time or update your availability.')).not.toBeInTheDocument();
  });
});
