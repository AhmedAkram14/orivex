import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { DoctorDirectoryBrowser } from './doctor-directory-browser';
import { server } from '@/mocks/server';
import enMessages from '../../../../../messages/en.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/patient/doctors',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderBrowser() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <DoctorDirectoryBrowser />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('DoctorDirectoryBrowser', () => {
  it('lists the seeded doctor by default', async () => {
    renderBrowser();

    expect(await screen.findByText('Dr. Sarah Ahmed')).toBeInTheDocument();
    expect(screen.getByText('Cardiology')).toBeInTheDocument();
  });

  it('shows the doctor\'s real review-derived rating, never a fabricated one, on each directory card', async () => {
    renderBrowser();
    await screen.findByText('Dr. Sarah Ahmed');

    expect(await screen.findByText('No reviews yet')).toBeInTheDocument();
  });

  it('narrows results by specialty search', async () => {
    renderBrowser();
    await screen.findByText('Dr. Sarah Ahmed');

    await userEvent.type(screen.getByLabelText('Search by specialty'), 'Dermatology');

    await waitFor(() => expect(screen.getByText('No doctors found')).toBeInTheDocument());
  });
});
