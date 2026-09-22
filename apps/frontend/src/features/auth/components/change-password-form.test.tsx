import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { authApi } from '@/features/auth/api/auth-api';
import { AUTH_ERROR_CODES } from '@/features/auth/api/types';
import { ApiError } from '@/shared/lib/api/client';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { toast } from '@/shared/ui/use-toast';

import { ChangePasswordForm } from './change-password-form';

vi.mock('@/features/auth/api/auth-api', () => ({
  authApi: { changePassword: vi.fn() },
}));
vi.mock('@/shared/ui/use-toast', () => ({ toast: vi.fn() }));

describe('ChangePasswordForm', () => {
  it('blocks submit and shows a validation error when confirm-password does not match', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChangePasswordForm />);

    await user.type(screen.getByLabelText('Current password'), 'CurrentPassword123');
    await user.type(screen.getByLabelText('New password'), 'NewPassword123');
    await user.type(screen.getByLabelText('Confirm new password'), 'SomethingElse123');
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
    expect(authApi.changePassword).not.toHaveBeenCalled();
  });

  it('blocks submit and shows a validation error when the new password is too short', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChangePasswordForm />);

    await user.type(screen.getByLabelText('Current password'), 'CurrentPassword123');
    await user.type(screen.getByLabelText('New password'), 'Short1A');
    await user.type(screen.getByLabelText('Confirm new password'), 'Short1A');
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByText('Password must be at least 10 characters.')).toBeInTheDocument();
    expect(authApi.changePassword).not.toHaveBeenCalled();
  });

  it('submits, clears the form, and shows a success toast on success', async () => {
    vi.mocked(authApi.changePassword).mockResolvedValue({ status: 'changed' });
    const user = userEvent.setup();
    renderWithProviders(<ChangePasswordForm />);

    const currentPasswordInput = screen.getByLabelText('Current password');
    const newPasswordInput = screen.getByLabelText('New password');
    const confirmPasswordInput = screen.getByLabelText('Confirm new password');

    await user.type(currentPasswordInput, 'CurrentPassword123');
    await user.type(newPasswordInput, 'NewPassword123');
    await user.type(confirmPasswordInput, 'NewPassword123');
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    await waitFor(() =>
      expect(authApi.changePassword).toHaveBeenCalledWith({
        currentPassword: 'CurrentPassword123',
        newPassword: 'NewPassword123',
      }),
    );
    await waitFor(() => expect(currentPasswordInput).toHaveValue(''));
    expect(newPasswordInput).toHaveValue('');
    expect(confirmPasswordInput).toHaveValue('');
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success', description: 'Password changed.' }));
  });

  it('shows a clearer inline message than the generic one when the current password is wrong', async () => {
    vi.mocked(authApi.changePassword).mockRejectedValue(
      new ApiError(401, {
        code: AUTH_ERROR_CODES.invalidCredentials,
        message: 'Invalid email or password.',
        requestId: 'req-1',
        timestamp: new Date().toISOString(),
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<ChangePasswordForm />);

    await user.type(screen.getByLabelText('Current password'), 'WrongPassword123');
    await user.type(screen.getByLabelText('New password'), 'NewPassword123');
    await user.type(screen.getByLabelText('Confirm new password'), 'NewPassword123');
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByText('Current password is incorrect.')).toBeInTheDocument();
    expect(screen.queryByText('Invalid email or password.')).not.toBeInTheDocument();
  });
});
