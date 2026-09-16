import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { MobileNav } from '@/features/shell/components/mobile-nav';
import { server } from '@/mocks/server';
import { resetMessagingStore } from '@/mocks/messaging-store';
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

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetMessagingStore();
});
afterAll(() => server.close());

const patientState: AuthState = {
  status: 'authenticated',
  user: { id: '1', email: 'patient@orivex.dev', fullName: 'Amina Youssef', roles: ['patient'] },
};

function renderMobileNav() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <AuthContext.Provider value={patientState}>
          <MobileNav />
        </AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
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

    await userEvent.click(screen.getByRole('link', { name: 'Security' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
