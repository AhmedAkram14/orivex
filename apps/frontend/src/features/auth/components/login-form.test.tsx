import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { LoginForm } from '@/features/auth/components/login-form';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/shared/test/render-with-providers';

// next-intl's navigation wrapper calls straight through to next/navigation's
// hooks, which throw outside a real Next.js App Router tree. These tests
// exercise form validation/error states, not routing, so a router double is
// enough — real navigation is Next.js's own concern, not this component's.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/login',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

async function fillAndSubmit(email: string, password: string) {
  await userEvent.type(screen.getByLabelText('Email'), email);
  await userEvent.type(screen.getByLabelText('Password'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('LoginForm', () => {
  it('shows a validation message instead of submitting when the email is empty', async () => {
    renderWithProviders(<LoginForm />);

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Email is required.')).toBeInTheDocument();
  });

  it('surfaces an inline error for invalid credentials without navigating away', async () => {
    renderWithProviders(<LoginForm />);

    await fillAndSubmit('doctor@orivex.dev', 'wrong-password');

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.');
  });

  it('shows the resend-verification action for an unverified account', async () => {
    renderWithProviders(<LoginForm />);

    await fillAndSubmit('unverified@orivex.dev', 'Password123!');

    expect(await screen.findByText('Verify your email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resend verification email' })).toBeInTheDocument();
  });
});
