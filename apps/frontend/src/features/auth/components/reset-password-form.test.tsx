import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/shared/test/render-with-providers';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/reset-password',
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
});
afterAll(() => server.close());

describe('ResetPasswordForm', () => {
  it('shows the invalid-link alert instead of the form for an expired token', async () => {
    renderWithProviders(<ResetPasswordForm token="expired-token" />);

    await userEvent.type(screen.getByLabelText('New password'), 'NewPassword123!');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'NewPassword123!');
    await userEvent.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(await screen.findByText('This link is no longer valid')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Request a new link' })).toBeInTheDocument();
  });

  it('resets the password and redirects to login for a valid token', async () => {
    renderWithProviders(<ResetPasswordForm token="valid-token" />);

    await userEvent.type(screen.getByLabelText('New password'), 'NewPassword123!');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'NewPassword123!');
    await userEvent.click(screen.getByRole('button', { name: 'Reset password' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/en/login'));
  });
});
