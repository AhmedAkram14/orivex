import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import DoctorProfilePage from './page';
import { server } from '@/mocks/server';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import enMessages from '../../../../../../messages/en.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/doctor/profile',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const doctorState: AuthState = {
  status: 'authenticated',
  user: { id: '1', email: 'doctor@orivex.dev', fullName: 'Dr. Sarah Ahmed', roles: ['doctor'] },
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <AuthContext.Provider value={doctorState}>
          <DoctorProfilePage />
        </AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('DoctorProfilePage', () => {
  it('shows the profile in view mode with every required section', async () => {
    renderPage();

    // The redesigned hero and the sidebar's Doctor Summary card both render
    // the doctor's real name, so this asserts at least one instance rather
    // than a single unique match.
    expect((await screen.findAllByText('Dr. Sarah Ahmed')).length).toBeGreaterThan(0);
    expect(screen.getByText('Professional information')).toBeInTheDocument();
    expect(screen.getByText('Publications')).toBeInTheDocument();
    expect(screen.getByText('Awards')).toBeInTheDocument();
    expect(screen.getByText('Contact information')).toBeInTheDocument();
  });

  it('toggles to edit mode and back to view mode on cancel', async () => {
    renderPage();
    await screen.findAllByText('Dr. Sarah Ahmed');

    // The redesigned view's Edit affordance now lives in the hero and the
    // sidebar's Quick Actions card rather than the page header -- either one
    // opens the same edit mode, so this clicks the first match.
    await userEvent.click(screen.getAllByRole('button', { name: /Edit profile/ })[0]);
    expect(screen.getByLabelText('Professional information')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByText('Professional information')).toBeInTheDocument();
    expect(screen.queryByLabelText('Professional information')).not.toBeInTheDocument();
  });
});
