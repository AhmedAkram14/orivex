import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UserMenu } from '@/features/shell/components/user-menu';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import { ThemeProvider } from '@/shared/providers/theme-provider';
import enMessages from '../../../../messages/en.json';

// UserMenu renders a real <Link> for the Security Center shortcut, which
// routes through next-intl's navigation wrapper -- that calls straight
// through to next/navigation's hooks, which throw outside a real Next.js
// App Router tree (same precedent as landing-navbar.test.tsx).
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/dashboard',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

const patientState: AuthState = {
  status: 'authenticated',
  user: { id: '1', email: 'patient@orivex.dev', fullName: 'Amina Youssef', roles: ['patient'] },
};

// Same storage key theme-provider.tsx's ThemeScript reads on next load --
// asserted by value here (not re-derived) so this test breaks loudly if the
// key ever changes without ThemeScript's read logic changing too.
const THEME_STORAGE_KEY = 'orivex-theme';

afterEach(() => {
  window.localStorage.clear();
});

function renderUserMenu() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <AuthContext.Provider value={patientState}>
          <ThemeProvider>
            <UserMenu />
          </ThemeProvider>
        </AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('UserMenu theme toggle', () => {
  it('flips data-theme on <html> and persists the choice to the same key ThemeScript reads, when Dark is selected', async () => {
    document.documentElement.removeAttribute('data-theme');
    renderUserMenu();

    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(await screen.findByRole('menuitemradio', { name: 'Dark' }));

    await waitFor(() => expect(document.documentElement.getAttribute('data-theme')).toBe('dark'));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('flips back to light and updates storage when Light is selected', async () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    renderUserMenu();

    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(await screen.findByRole('menuitemradio', { name: 'Light' }));

    await waitFor(() => expect(document.documentElement.getAttribute('data-theme')).toBe('light'));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('removes the explicit data-theme attribute and stores "system" when System is selected', async () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    renderUserMenu();

    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(await screen.findByRole('menuitemradio', { name: 'System' }));

    await waitFor(() => expect(document.documentElement.hasAttribute('data-theme')).toBe(false));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
  });
});
