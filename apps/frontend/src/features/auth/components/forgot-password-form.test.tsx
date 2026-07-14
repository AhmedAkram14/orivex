import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/shared/test/render-with-providers';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/forgot-password',
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

describe('ForgotPasswordForm', () => {
  it('shows a validation message instead of submitting when the email is empty', async () => {
    renderWithProviders(<ForgotPasswordForm />);

    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByText('Email is required.')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('redirects to check-email after a successful submission, regardless of whether the account exists', async () => {
    renderWithProviders(<ForgotPasswordForm />);

    await userEvent.type(screen.getByLabelText('Email'), 'nobody@orivex.dev');
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/en/check-email?email=nobody%40orivex.dev&reason=forgot-password'),
    );
  });
});
