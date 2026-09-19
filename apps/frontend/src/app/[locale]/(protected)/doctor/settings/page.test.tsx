import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import DoctorSettingsPage from './page';
import { server } from '@/mocks/server';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import { ThemeProvider } from '@/shared/providers/theme-provider';
import enMessages from '../../../../../../messages/en.json';

const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/doctor/settings',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

vi.mock('@/shared/i18n/navigation', async () => {
  const actual = await vi.importActual<typeof import('@/shared/i18n/navigation')>('@/shared/i18n/navigation');
  return {
    ...actual,
    usePathname: () => '/doctor/settings',
    useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  };
});

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  replaceMock.mockClear();
});
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
          <ThemeProvider>
            <DoctorSettingsPage />
          </ThemeProvider>
        </AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('DoctorSettingsPage', () => {
  it('renders working theme and language controls', async () => {
    renderPage();

    expect(await screen.findByText('Theme')).toBeInTheDocument();
    expect(screen.getByText('Language')).toBeInTheDocument();

    const darkOption = screen.getByRole('radio', { name: /Dark/ });
    await userEvent.click(darkOption);
    expect(darkOption).toHaveAttribute('data-state', 'checked');

    // Each language names itself in its own script regardless of the
    // current UI language -- "العربية", never a translated "Arabic".
    const arabicOption = screen.getByRole('radio', { name: 'العربية' });
    await userEvent.click(arabicOption);
    expect(replaceMock).toHaveBeenCalledWith('/doctor/settings', { locale: 'ar' });
  });

  it('gives each radio group its own accessible name, distinguishing Theme from Language', async () => {
    renderPage();

    expect(await screen.findByRole('radiogroup', { name: 'Theme' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Language' })).toBeInTheDocument();
  });

  it('makes the whole row clickable, not just the small circle', async () => {
    renderPage();

    // Clicking the visible text itself (not the radio button) must select
    // the option -- the row uses a click handler rather than relying on
    // label-forwarding, which doesn't work for a <button role="radio">.
    const darkText = await screen.findByText('Dark');
    await userEvent.click(darkText);
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('data-state', 'checked');
  });
});
