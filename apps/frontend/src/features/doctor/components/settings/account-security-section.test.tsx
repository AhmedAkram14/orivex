import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { authApi } from '@/features/auth/api/auth-api';
import { identityApi } from '@/features/identity/api/identity-api';
import type { Account } from '@/features/identity/api/types';
import { renderWithProviders } from '@/shared/test/render-with-providers';

import { AccountSecuritySection } from './account-security-section';

vi.mock('@/features/auth/api/auth-api', () => ({
  authApi: { changePassword: vi.fn() },
}));
vi.mock('@/features/identity/api/identity-api', () => ({
  identityApi: { getMyAccount: vi.fn(), updateMyPersonalProfile: vi.fn(), getAccountById: vi.fn() },
}));
vi.mock('@/shared/ui/use-toast', () => ({ toast: vi.fn() }));

const ACCOUNT: Account = {
  id: 'acct-1',
  email: 'doctor@example.com',
  role: 'doctor',
  status: 'active',
  displayName: 'Dr. Amina Youssef',
  phoneNumber: '+201234567890',
  preferredLanguage: 'en',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('AccountSecuritySection', () => {
  it('renders the change-password form', async () => {
    vi.mocked(identityApi.getMyAccount).mockResolvedValue(ACCOUNT);
    renderWithProviders(<AccountSecuritySection />);

    expect(await screen.findByLabelText('Current password')).toBeInTheDocument();
    expect(screen.getByLabelText('New password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm new password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change password' })).toBeInTheDocument();
  });

  it('pre-fills the phone field from the current account and enables Save only once it changes', async () => {
    vi.mocked(identityApi.getMyAccount).mockResolvedValue(ACCOUNT);
    const user = userEvent.setup();
    renderWithProviders(<AccountSecuritySection />);

    const phoneInput = await screen.findByPlaceholderText('Enter your phone number');
    await waitFor(() => expect(phoneInput).toHaveValue('+201234567890'));

    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).toBeDisabled();

    await user.clear(phoneInput);
    await user.type(phoneInput, '+201111111111');
    expect(saveButton).not.toBeDisabled();
  });

  it('renders a correct cross-link to /security', async () => {
    vi.mocked(identityApi.getMyAccount).mockResolvedValue(ACCOUNT);
    renderWithProviders(<AccountSecuritySection />);

    const link = await screen.findByRole('link', { name: /Sessions, login history & logout/ });
    expect(link).toHaveAttribute('href', '/en/security');
  });

  it('renders the 2FA and email-change rows visibly disabled, not responding to interaction', async () => {
    vi.mocked(identityApi.getMyAccount).mockResolvedValue(ACCOUNT);
    const user = userEvent.setup();
    renderWithProviders(<AccountSecuritySection />);

    await screen.findByLabelText('Current password');

    const twoFactorSwitch = screen.getByRole('switch', { name: 'Two-factor authentication' });
    expect(twoFactorSwitch).toBeDisabled();
    expect(twoFactorSwitch).toHaveAttribute('data-state', 'unchecked');
    await user.click(twoFactorSwitch);
    expect(twoFactorSwitch).toHaveAttribute('data-state', 'unchecked');

    const changeEmailButton = screen.getByRole('button', { name: 'Change email' });
    expect(changeEmailButton).toBeDisabled();

    expect(screen.getAllByText('Coming soon')).toHaveLength(2);
  });

  it('opens the deletion dialog on click and makes no network call', async () => {
    vi.mocked(identityApi.getMyAccount).mockResolvedValue(ACCOUNT);
    const user = userEvent.setup();
    renderWithProviders(<AccountSecuritySection />);

    await screen.findByLabelText('Current password');
    await user.click(screen.getByRole('button', { name: 'Request account deletion' }));

    expect(await screen.findByRole('dialog', { name: 'Request account deletion' })).toBeInTheDocument();
    expect(screen.getByText(/Account deletion isn't available/)).toBeInTheDocument();
    expect(identityApi.updateMyPersonalProfile).not.toHaveBeenCalled();
    expect(authApi.changePassword).not.toHaveBeenCalled();
  });
});
