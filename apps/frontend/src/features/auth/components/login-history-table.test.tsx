import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { LoginHistoryTable } from '@/features/auth/components/login-history-table';
import { useLogin } from '@/features/auth/hooks/use-login';
import { SessionProvider } from '@/features/auth/providers/session-provider';
import { server } from '@/mocks/server';
import enMessages from '../../../../messages/en.json';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function AuthenticatedLoginHistoryTable() {
  const login = useLogin();

  return (
    <div>
      <button type="button" onClick={() => login.mutate({ email: 'doctor@orivex.dev', password: 'Password123!' })}>
        Log in
      </button>
      {login.isSuccess && <LoginHistoryTable />}
    </div>
  );
}

describe('LoginHistoryTable', () => {
  it('lists recent sign-in attempts with their outcome', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <NextIntlClientProvider locale="en" messages={enMessages}>
          <SessionProvider>
            <AuthenticatedLoginHistoryTable />
          </SessionProvider>
        </NextIntlClientProvider>
      </QueryClientProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Chrome on Windows')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
  });
});
