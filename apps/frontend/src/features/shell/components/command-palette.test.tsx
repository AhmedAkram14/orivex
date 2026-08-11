import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommandPalette } from '@/features/shell/components/command-palette';
import { server } from '@/mocks/server';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
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
});
afterAll(() => server.close());
beforeEach(() => window.localStorage.clear());

function renderPalette(user: AuthState = patientState) {
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
  it('shows role-appropriate search copy -- a patient is never told to search for "patients"', () => {
    renderPalette(patientState);
    expect(screen.getByText('Search doctors, appointments…')).toBeInTheDocument();
    expect(screen.queryByText('Search patients, appointments…')).not.toBeInTheDocument();
  });

  it('shows the doctor-facing search copy for a doctor account', () => {
    renderPalette(doctorState);
    expect(screen.getByText('Search patients, appointments…')).toBeInTheDocument();
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
});
