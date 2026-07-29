import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import { ThemeProvider } from '@/shared/providers/theme-provider';

import { LandingNavbar } from './landing-navbar';

// next-intl's navigation wrapper calls straight through to next/navigation's
// hooks, which throw outside a real Next.js App Router tree -- needed here
// since the signed-in state renders LandingUserMenu, which calls useRouter()
// to redirect after sign-out.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

const unauthenticatedState: AuthState = { status: 'unauthenticated', user: null };
const authenticatedState: AuthState = {
  status: 'authenticated',
  user: { id: '1', email: 'amina@orivex.dev', fullName: 'Amina Youssef', roles: ['patient'] },
};

function renderNavbar(state: AuthState = unauthenticatedState) {
  return renderWithProviders(
    <AuthContext.Provider value={state}>
      <ThemeProvider>
        <LandingNavbar />
      </ThemeProvider>
    </AuthContext.Provider>,
  );
}

describe('LandingNavbar', () => {
  it('links each section anchor and the sign-in/register CTAs to their real destinations when signed out', () => {
    renderNavbar();

    expect(screen.getByRole('link', { name: 'Specialties' })).toHaveAttribute('href', '#specialties');
    expect(screen.getByRole('link', { name: 'How It Works' })).toHaveAttribute('href', '#how-it-works');
    expect(screen.getByRole('link', { name: 'For Doctors' })).toHaveAttribute('href', '#for-doctors');
    expect(screen.getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '#faq');

    const signInLinks = screen.getAllByRole('link', { name: 'Sign In' });
    expect(signInLinks[0]).toHaveAttribute('href', expect.stringContaining('/login'));
    const registerLinks = screen.getAllByRole('link', { name: 'Register' });
    expect(registerLinks[0]).toHaveAttribute('href', expect.stringContaining('/register'));
  });

  it('opens the mobile menu with the same links when the menu button is clicked', async () => {
    renderNavbar();

    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(screen.getAllByRole('link', { name: 'Specialties' }).length).toBeGreaterThan(0);
  });

  it('replaces the sign-in/register buttons with the account avatar and name when signed in', () => {
    renderNavbar(authenticatedState);

    expect(screen.getByText('Amina Youssef')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sign In' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Register' })).not.toBeInTheDocument();
  });

  it("opens a dropdown with Go to Dashboard, theme options, and Sign out when the avatar is clicked", async () => {
    renderNavbar(authenticatedState);

    await userEvent.click(screen.getByText('Amina Youssef'));

    expect(await screen.findByRole('menuitem', { name: /Go to Dashboard/ })).toHaveAttribute(
      'href',
      expect.stringContaining('/dashboard'),
    );
    expect(screen.getByRole('menuitemradio', { name: 'Light' })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: 'Dark' })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: 'System' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Sign out/ })).toBeInTheDocument();
  });
});
