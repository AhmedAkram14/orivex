import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommandPalette } from '@/features/shell/components/command-palette';
import { endSession, MOCK_ACCOUNTS, startSession } from '@/mocks/auth-store';
import { server } from '@/mocks/server';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import { env } from '@/shared/lib/env';
import { ThemeProvider } from '@/shared/providers/theme-provider';
import enMessages from '../../../../messages/en.json';

const patientState: AuthState = {
  status: 'authenticated',
  user: { id: '1', email: 'patient@orivex.dev', fullName: 'Amina Youssef', roles: ['patient'] },
};

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/dashboard',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  push.mockClear();
  window.localStorage.clear();
  window.sessionStorage.clear();
  endSession();
});
afterAll(() => server.close());
beforeEach(() => window.localStorage.clear());

/**
 * ORIVEX Roadmap Phase 2 -- Real Global Search: `mocks/handlers/search.ts`
 * derives its per-role result restriction from the mock auth-store's own
 * "logged in" session (`getCurrentAccount()`, same precedent as
 * `handlers/auth.ts`'s `/auth/me`), not from this test's `AuthContext.Provider`
 * value -- the two are independent by design (`AuthContext` is pure React
 * state; the mock backend's session is separate in-memory state). Every
 * `AuthState` this suite renders with already matches a seeded
 * `MOCK_ACCOUNTS` entry by email, so this keeps them in sync for real.
 */
function renderPalette(user: AuthState = patientState) {
  const account = MOCK_ACCOUNTS.find((candidate) => candidate.email === user.user?.email);
  if (account) startSession(account);

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <AuthContext.Provider value={user}>
          <ThemeProvider>
            <CommandPalette />
          </ThemeProvider>
        </AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

const doctorState: AuthState = {
  status: 'authenticated',
  user: { id: '2', email: 'doctor@orivex.dev', fullName: 'Dr. Sarah Ahmed', roles: ['doctor'] },
};

describe('CommandPalette', () => {
  // Phase 1 (dead-end cleanup, 2026-08-13): this trigger used to claim
  // "Search patients, appointments…" / "Search doctors, appointments…" --
  // a real business-entity search that doesn't exist yet (only real
  // navigation/action commands do). Regression guard: never re-introduce
  // an entity-specific claim here until a real search endpoint exists.
  it('never claims to search real business entities (patients/doctors/appointments) before a real search endpoint exists', () => {
    renderPalette(patientState);
    expect(screen.queryByText(/Search patients/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Search doctors/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Search.*appointments/)).not.toBeInTheDocument();
  });

  it('shows the same honest search-and-commands copy regardless of role', () => {
    renderPalette(patientState);
    expect(screen.getByText('Search & commands…')).toBeInTheDocument();

    renderPalette(doctorState);
    expect(screen.getAllByText('Search & commands…').length).toBeGreaterThan(0);
  });

  it('is closed until the trigger button is clicked', async () => {
    renderPalette();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Search/ }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('opens via the ⌘K/Ctrl+K keyboard shortcut from anywhere on the page', async () => {
    renderPalette();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.keyboard('{Control>}k{/Control}');

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('navigates and closes when a navigation command is selected', async () => {
    renderPalette();
    await userEvent.click(screen.getByRole('button', { name: /Search/ }));
    await screen.findByRole('dialog');

    await userEvent.click(screen.getByText('Dashboard'));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/en/dashboard'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('applies the theme immediately when a theme command is selected', async () => {
    renderPalette();
    await userEvent.click(screen.getByRole('button', { name: /Search/ }));
    await screen.findByRole('dialog');

    await userEvent.click(screen.getByText('Switch to dark theme'));

    await waitFor(() => expect(document.documentElement.getAttribute('data-theme')).toBe('dark'));
  });

  it('surfaces a previously executed command under Recent the next time it opens', async () => {
    renderPalette();
    await userEvent.click(screen.getByRole('button', { name: /Search/ }));
    await screen.findByRole('dialog');
    await userEvent.click(screen.getByText('Security'));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/en/security'));

    await userEvent.click(screen.getByRole('button', { name: /Search/ }));
    await screen.findByRole('dialog');

    expect(screen.getByText('Recent')).toBeInTheDocument();
  });

  // ORIVEX Roadmap Phase 2 -- Real Global Search: the palette now fires a
  // real (MSW-backed) `GET /search` once 2+ characters are typed, in
  // addition to the always-present static commands above.
  describe('real global search (Phase 2)', () => {
    it('does not call the search endpoint for a query under 2 characters', async () => {
      const searchSpy = vi.fn();
      server.use(
        http.get(`${env.apiBaseUrl}/search`, () => {
          searchSpy();
          return HttpResponse.json({ data: { results: [], total: 0 } });
        }),
      );
      renderPalette(patientState);
      await userEvent.click(screen.getByRole('button', { name: /Search/ }));
      await screen.findByRole('dialog');

      await userEvent.type(screen.getByPlaceholderText('Jump to a page or run a command...'), 's');
      await new Promise((resolve) => setTimeout(resolve, 400));

      expect(searchSpy).not.toHaveBeenCalled();
    });

    it('fires the real search after debounce and renders results grouped by type with icon/title/subtitle', async () => {
      renderPalette(patientState);
      await userEvent.click(screen.getByRole('button', { name: /Search/ }));
      await screen.findByRole('dialog');

      await userEvent.type(screen.getByPlaceholderText('Jump to a page or run a command...'), 'Sarah');

      expect(await screen.findByText('Doctors', {}, { timeout: 2000 })).toBeInTheDocument();
      expect(await screen.findByText('Dr. Sarah Ahmed')).toBeInTheDocument();
      expect(screen.getByText('Cardiology')).toBeInTheDocument();
    });

    it('navigates a Patient viewer to the real doctor detail route when a doctor result is selected', async () => {
      renderPalette(patientState);
      await userEvent.click(screen.getByRole('button', { name: /Search/ }));
      await screen.findByRole('dialog');

      await userEvent.type(screen.getByPlaceholderText('Jump to a page or run a command...'), 'Sarah');
      const result = await screen.findByText('Dr. Sarah Ahmed', {}, { timeout: 2000 });
      await userEvent.click(result);

      await waitFor(() => expect(push).toHaveBeenCalledWith('/en/patient/doctors/doctor-profile-1'));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('navigates a Doctor viewer to the real (undeep-linked) patients list when a patient result is selected', async () => {
      renderPalette(doctorState);
      await userEvent.click(screen.getByRole('button', { name: /Search/ }));
      await screen.findByRole('dialog');

      await userEvent.type(screen.getByPlaceholderText('Jump to a page or run a command...'), 'Mona');

      expect(await screen.findByText('Patients', {}, { timeout: 2000 })).toBeInTheDocument();
      // The seeded doctor's Upcoming Work list reuses the same patient names
      // as its Patients roster (`doctor-store.ts`), so "Mona Farouk" also
      // matches a real Appointments result -- both are genuine, separate
      // `CommandItem`s. Rendering order puts the Patients group first.
      const results = await screen.findAllByText('Mona Farouk');
      await userEvent.click(results[0]);

      await waitFor(() => expect(push).toHaveBeenCalledWith('/en/doctor/patients'));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('shows an honest "no results" message for a real zero-result response', async () => {
      renderPalette(patientState);
      await userEvent.click(screen.getByRole('button', { name: /Search/ }));
      await screen.findByRole('dialog');

      await userEvent.type(screen.getByPlaceholderText('Jump to a page or run a command...'), 'zzzznomatch');

      expect(await screen.findByText('No results for "zzzznomatch".', {}, { timeout: 2000 })).toBeInTheDocument();
    });

    it('shows a real error state when the search request fails', async () => {
      server.use(
        http.get(`${env.apiBaseUrl}/search`, () =>
          HttpResponse.json(
            { error: { code: 'INTERNAL', message: 'boom', requestId: 'mock', timestamp: new Date().toISOString() } },
            { status: 500 },
          ),
        ),
      );
      renderPalette(patientState);
      await userEvent.click(screen.getByRole('button', { name: /Search/ }));
      await screen.findByRole('dialog');

      await userEvent.type(screen.getByPlaceholderText('Jump to a page or run a command...'), 'Sarah');

      expect(
        await screen.findByText('Something went wrong while searching. Please try again.', {}, { timeout: 2000 }),
      ).toBeInTheDocument();
    });
  });
});
