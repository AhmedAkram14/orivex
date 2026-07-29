import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/shared/test/render-with-providers';

import { SearchSection } from './search-section';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/',
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

describe('SearchSection', () => {
  it('submits a name search into the real doctor directory, preserving the query', async () => {
    renderWithProviders(<SearchSection />);

    await userEvent.type(screen.getByLabelText('Doctor name'), 'Sarah');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/en/patient/doctors?specialty=Sarah'));
  });

  it('submits with no query params when nothing is entered', async () => {
    renderWithProviders(<SearchSection />);

    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/en/patient/doctors'));
  });
});
