import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AUTH_PATHS } from '@/features/auth/api/paths';
import { SocialSignInButtons } from '@/features/auth/components/social-sign-in-buttons';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';
import { renderWithProviders } from '@/shared/test/render-with-providers';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/login',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams('returnTo=/appointments/new'),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function offerProviders(providers: string[]) {
  server.use(
    http.get(`${env.apiBaseUrl}${AUTH_PATHS.oauthProviders}`, () => HttpResponse.json({ data: { providers } })),
  );
}

describe('SocialSignInButtons', () => {
  it('links each configured provider to the backend start URL, carrying the locale and returnTo', async () => {
    offerProviders(['google', 'facebook']);
    renderWithProviders(<SocialSignInButtons />);

    const google = await screen.findByRole('link', { name: 'Continue with Google' });
    expect(google).toHaveAttribute(
      'href',
      `${env.apiBaseUrl}/auth/oauth/google/start?locale=en&returnTo=%2Fappointments%2Fnew`,
    );
    expect(screen.getByRole('link', { name: 'Continue with Facebook' })).toHaveAttribute(
      'href',
      `${env.apiBaseUrl}/auth/oauth/facebook/start?locale=en&returnTo=%2Fappointments%2Fnew`,
    );
  });

  it('renders nothing when no provider is configured', async () => {
    offerProviders([]);
    const { container } = renderWithProviders(<SocialSignInButtons />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
