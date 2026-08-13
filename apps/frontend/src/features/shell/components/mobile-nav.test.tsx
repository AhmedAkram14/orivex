import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { MobileNav } from '@/features/shell/components/mobile-nav';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import enMessages from '../../../../messages/en.json';

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

function renderMobileNav() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <AuthContext.Provider value={patientState}>
        <MobileNav />
      </AuthContext.Provider>
    </NextIntlClientProvider>,
  );
}

describe('MobileNav', () => {
  it('is closed until the menu button is clicked', async () => {
    renderMobileNav();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  // Regression guard: App Router client-side navigation never unmounts this
  // shell component, so without an explicit close-on-navigate handler the
  // drawer would stay open over the newly-navigated page -- exactly the
  // reported bug this test locks in the fix for.
  it('collapses itself once a nav link is clicked, instead of staying open over the new page', async () => {
    renderMobileNav();
    await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    await screen.findByRole('dialog');

    await userEvent.click(screen.getByRole('link', { name: 'Dashboard' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
