import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { DeviceSessionsList } from '@/features/auth/components/device-sessions-list';
import { useLogin } from '@/features/auth/hooks/use-login';
import { SessionProvider } from '@/features/auth/providers/session-provider';
import { server } from '@/mocks/server';
import enMessages from '../../../../messages/en.json';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function AuthenticatedDeviceSessionsList() {
  const login = useLogin();

  return (
    <div>
      <button type="button" onClick={() => login.mutate({ email: 'doctor@orivex.dev', password: 'Password123!' })}>
        Log in
      </button>
      {login.isSuccess && <DeviceSessionsList />}
    </div>
  );
}

function renderAuthenticated() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <SessionProvider>
          <AuthenticatedDeviceSessionsList />
        </SessionProvider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('DeviceSessionsList', () => {
  it('lists every device session, badges the current one, and hides revoke for it', async () => {
    renderAuthenticated();
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('This device')).toBeInTheDocument();
    expect(await screen.findByText(/iPhone 15/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Revoke' })).toHaveLength(1);
  });

  it('revokes a non-current device session after confirming', async () => {
    renderAuthenticated();
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    await screen.findByText(/iPhone 15/);
    await userEvent.click(screen.getByRole('button', { name: 'Revoke' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/iPhone 15/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Revoke' }));

    await waitFor(() => expect(screen.queryByText(/iPhone 15/)).not.toBeInTheDocument());
  });
});
