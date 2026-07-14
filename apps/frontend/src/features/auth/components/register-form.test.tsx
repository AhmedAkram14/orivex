import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { RegisterForm } from '@/features/auth/components/register-form';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/shared/test/render-with-providers';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/register',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

async function fillAndSubmit(email: string) {
  await userEvent.type(screen.getByLabelText('Full name'), 'Ahmed Hassan');
  await userEvent.type(screen.getByLabelText('Email'), email);
  await userEvent.type(screen.getByLabelText('Password'), 'Password123!');
  await userEvent.type(screen.getByLabelText('Confirm password'), 'Password123!');
  await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
}

describe('RegisterForm', () => {
  it('shows a validation message instead of submitting when required fields are empty', async () => {
    renderWithProviders(<RegisterForm />);

    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Enter your full name.')).toBeInTheDocument();
  });

  it('surfaces an inline error when the email is already registered', async () => {
    renderWithProviders(<RegisterForm />);

    await fillAndSubmit('doctor@orivex.dev');

    expect(await screen.findByRole('alert')).toHaveTextContent('An account with this email already exists.');
  });

  it('submits successfully for a new email', async () => {
    renderWithProviders(<RegisterForm />);

    await fillAndSubmit('new-patient@orivex.dev');

    await screen.findByRole('button', { name: 'Create account' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
