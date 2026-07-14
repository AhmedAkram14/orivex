import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { useLogin } from '@/features/auth/hooks/use-login';
import { useLogout } from '@/features/auth/hooks/use-logout';
import { SessionProvider } from '@/features/auth/providers/session-provider';
import { server } from '@/mocks/server';
import { useAuth } from '@/shared/auth/auth-context';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function TestHarness() {
  const { status, user } = useAuth();
  const login = useLogin();
  const logout = useLogout();

  return (
    <div>
      <p data-testid="status">{status}</p>
      <p data-testid="user">{user?.fullName ?? 'none'}</p>
      <button
        type="button"
        onClick={() => login.mutate({ email: 'doctor@orivex.dev', password: 'Password123!' })}
      >
        Log in
      </button>
      <button
        type="button"
        onClick={() => login.mutate({ email: 'doctor@orivex.dev', password: 'wrong-password' })}
      >
        Log in with wrong password
      </button>
      <button type="button" onClick={() => logout.mutate()}>
        Log out
      </button>
      {login.isError && <p data-testid="login-error">{login.error.message}</p>}
    </div>
  );
}

function renderHarness() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <TestHarness />
      </SessionProvider>
    </QueryClientProvider>,
  );
}

describe('SessionProvider + login/logout', () => {
  it('starts unauthenticated, becomes authenticated after a successful login, and unauthenticated again after logout', async () => {
    renderHarness();

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));

    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    expect(screen.getByTestId('user')).toHaveTextContent('Dr. Sarah Ahmed');

    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
    expect(screen.getByTestId('user')).toHaveTextContent('none');
  });

  it('surfaces an error and stays unauthenticated on invalid credentials', async () => {
    renderHarness();

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));

    await userEvent.click(screen.getByRole('button', { name: 'Log in with wrong password' }));

    await waitFor(() => expect(screen.getByTestId('login-error')).toHaveTextContent('Incorrect email or password.'));
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });
});
