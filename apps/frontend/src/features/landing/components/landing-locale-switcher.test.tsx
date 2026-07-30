import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';

import { LandingLocaleSwitcher } from './landing-locale-switcher';

const replace = vi.fn();

// next-intl's navigation wrapper calls straight through to next/navigation's
// hooks, which throw outside a real Next.js App Router tree.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace, refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

describe('LandingLocaleSwitcher', () => {
  it('switches to the real /ar route for the current page when Arabic is selected', async () => {
    renderWithProviders(<LandingLocaleSwitcher />);

    expect(screen.getByText('English')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /English/ }));
    await userEvent.click(await screen.findByRole('menuitemradio', { name: 'Arabic' }));

    expect(replace).toHaveBeenCalledWith('/ar');
  });
});
