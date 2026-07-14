import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { LogoutAllDevicesButton } from '@/features/auth/components/logout-all-devices-button';
import { useLogin } from '@/features/auth/hooks/use-login';
import { SessionProvider } from '@/features/auth/providers/session-provider';
import { server } from '@/mocks/server';
import enMessages from '../../../../messages/en.json';

const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace, refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/security',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  replace.mockClear();
});
afterAll(() => server.close());

function AuthenticatedLogoutAllButton() {
  const login = useLogin();

  return (
    <div>
      <button type="button" onClick={() => login.mutate({ email: 'doctor@orivex.dev', password: 'Password123!' })}>
        Log in
      </button>
      {login.isSuccess && <LogoutAllDevicesButton />}
    </div>
  );
}

describe('LogoutAllDevicesButton', () => {
  it('ends every session and redirects to login only after the confirmation dialog is confirmed', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <NextIntlClientProvider locale="en" messages={enMessages}>
          <SessionProvider>
            <AuthenticatedLogoutAllButton />
          </SessionProvider>
        </NextIntlClientProvider>
      </QueryClientProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out of all devices' }));
    expect(replace).not.toHaveBeenCalled();

    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Sign out everywhere' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/en/login'));
  });
});
