import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AUTH_PATHS } from '@/features/auth/api/paths';
import { VerifyEmailStatus } from '@/features/auth/components/verify-email-status';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { env } from '@/shared/lib/env';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/verify-email',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('VerifyEmailStatus', () => {
  it('verifies automatically on mount and shows success for a valid token', async () => {
    renderWithProviders(<VerifyEmailStatus token="valid-token" />);

    expect(await screen.findByText('Your email has been verified. You can now sign in.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue to sign in' })).toBeInTheDocument();
  });

  it('shows the invalid-link message for an expired token', async () => {
    renderWithProviders(<VerifyEmailStatus token="expired-token" />);

    expect(await screen.findByText('This link is no longer valid')).toBeInTheDocument();
  });

  it('shows a generic error for a failure unrelated to the token itself', async () => {
    server.use(
      http.post(`${env.apiBaseUrl}${AUTH_PATHS.verifyEmail}`, () =>
        HttpResponse.json(
          { error: { code: 'SERVER_ERROR', message: 'Something went wrong.', requestId: 'mock', timestamp: new Date().toISOString() } },
          { status: 500 },
        ),
      ),
    );

    renderWithProviders(<VerifyEmailStatus token="valid-token" />);

    expect(await screen.findByText('Verification failed')).toBeInTheDocument();
  });
});
