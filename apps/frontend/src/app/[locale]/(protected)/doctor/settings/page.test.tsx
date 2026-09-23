import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { doctorApi } from '@/features/doctor/api/doctor-api';
import type { DoctorProfile } from '@/features/doctor/api/types';
import { identityApi } from '@/features/identity/api/identity-api';
import type { Account } from '@/features/identity/api/types';
import { notificationsApi } from '@/features/notifications/api/notifications-api';
import type { NotificationPreferences } from '@/features/notifications/api/types';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import { ThemeProvider } from '@/shared/providers/theme-provider';
import enMessages from '../../../../../../messages/en.json';

import DoctorSettingsPage from './page';

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

vi.mock('@/features/doctor/api/doctor-api', () => ({
  doctorApi: { getProfile: vi.fn(), updateProfile: vi.fn() },
}));
vi.mock('@/features/identity/api/identity-api', () => ({
  identityApi: { getMyAccount: vi.fn(), updateMyPersonalProfile: vi.fn(), getAccountById: vi.fn() },
}));
vi.mock('@/features/auth/api/auth-api', () => ({
  authApi: { changePassword: vi.fn() },
}));
vi.mock('@/features/notifications/api/notifications-api', () => ({
  notificationsApi: { getPreferences: vi.fn(), updatePreferences: vi.fn() },
}));

afterEach(() => {
  replaceMock.mockClear();
});

const doctorState: AuthState = {
  status: 'authenticated',
  user: { id: '1', email: 'doctor@orivex.dev', fullName: 'Dr. Sarah Ahmed', roles: ['doctor'] },
};

const ACCOUNT: Account = {
  id: 'acct-1',
  email: 'doctor@orivex.dev',
  role: 'doctor',
  status: 'active',
  displayName: 'Dr. Sarah Ahmed',
  phoneNumber: '+201234567890',
  preferredLanguage: 'en',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const PROFILE: DoctorProfile = {
  id: 'doctor-profile-1',
  accountId: 'acct-1',
  fullName: 'Dr. Sarah Ahmed',
  email: 'doctor@orivex.dev',
  licenseNumber: 'LIC-2010-4471',
  specialtyId: 'specialty-cardiology',
  languages: ['en'],
  insuranceProviders: [],
  publications: [],
  awards: [],
  workExperience: [],
  createdAt: '2020-01-15T00:00:00.000Z',
  updatedAt: '2020-01-15T00:00:00.000Z',
  maxFreeSlotsPerDay: 3,
  bufferMinutesOverride: 15,
  autoApproveFreeBookings: false,
};

const PREFERENCES: NotificationPreferences = {
  emailAppointments: true,
  emailBilling: true,
  inAppAppointments: true,
  inAppBilling: true,
  emailNewDeviceLogin: true,
};

function renderPage() {
  vi.mocked(identityApi.getMyAccount).mockResolvedValue(ACCOUNT);
  vi.mocked(doctorApi.getProfile).mockResolvedValue(PROFILE);
  vi.mocked(notificationsApi.getPreferences).mockResolvedValue(PREFERENCES);

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
  it('renders every section of the fully assembled page', async () => {
    renderPage();

    expect(await screen.findByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Account & Security')).toBeInTheDocument();
    expect(screen.getByText('Consultation Defaults')).toBeInTheDocument();
    expect(screen.getByText('Timezone')).toBeInTheDocument();
    expect(screen.getByText('Availability')).toBeInTheDocument();
    expect(screen.getByText('Sessions')).toBeInTheDocument();
    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getByText('Language')).toBeInTheDocument();
  });

  it('gives the two cross-links their correct hrefs', async () => {
    renderPage();

    await screen.findByText('Notifications');
    expect(screen.getByRole('link', { name: /Go to Schedule/ })).toHaveAttribute('href', '/en/doctor/schedule');
    expect(screen.getByRole('link', { name: /Go to Security/ })).toHaveAttribute('href', '/en/security');
  });

  it('confirms no Payout section exists anywhere on the page', async () => {
    renderPage();

    await screen.findByText('Notifications');
    expect(screen.queryByText(/payout/i)).not.toBeInTheDocument();
  });

  it('still renders working, accessible theme and language controls', async () => {
    renderPage();

    expect(await screen.findByRole('radiogroup', { name: 'Theme' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Language' })).toBeInTheDocument();

    const darkOption = screen.getByRole('radio', { name: /Dark/ });
    await userEvent.click(darkOption);
    expect(darkOption).toHaveAttribute('data-state', 'checked');

    const arabicOption = screen.getByRole('radio', { name: 'العربية' });
    await userEvent.click(arabicOption);
    expect(replaceMock).toHaveBeenCalledWith('/doctor/settings', { locale: 'ar' });
  });

  it('makes the whole theme row clickable, not just the small circle', async () => {
    renderPage();

    const darkText = await screen.findByText('Dark');
    await userEvent.click(darkText);
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('data-state', 'checked');
  });
});
