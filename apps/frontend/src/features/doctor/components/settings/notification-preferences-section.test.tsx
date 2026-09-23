import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { notificationsApi } from '@/features/notifications/api/notifications-api';
import type { NotificationPreferences } from '@/features/notifications/api/types';
import { ApiError } from '@/shared/lib/api/client';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { toast } from '@/shared/ui/use-toast';

import { NotificationPreferencesSection } from './notification-preferences-section';

vi.mock('@/features/notifications/api/notifications-api', () => ({
  notificationsApi: { getPreferences: vi.fn(), updatePreferences: vi.fn() },
}));
vi.mock('@/shared/ui/use-toast', () => ({ toast: vi.fn() }));

const PREFERENCES: NotificationPreferences = {
  emailAppointments: true,
  emailBilling: false,
  inAppAppointments: true,
  inAppBilling: false,
  emailNewDeviceLogin: true,
};

describe('NotificationPreferencesSection', () => {
  it('renders the 4 toggles in their correct initial states from the GET response', async () => {
    vi.mocked(notificationsApi.getPreferences).mockResolvedValue(PREFERENCES);
    renderWithProviders(<NotificationPreferencesSection />);

    const emailAppointments = await screen.findByRole('checkbox', { name: 'Email notifications for Appointments' });
    const inAppAppointments = screen.getByRole('checkbox', { name: 'In-app notifications for Appointments' });
    const emailBilling = screen.getByRole('checkbox', { name: 'Email notifications for Billing' });
    const inAppBilling = screen.getByRole('checkbox', { name: 'In-app notifications for Billing' });

    expect(emailAppointments).toHaveAttribute('data-state', 'checked');
    expect(inAppAppointments).toHaveAttribute('data-state', 'checked');
    expect(emailBilling).toHaveAttribute('data-state', 'unchecked');
    expect(inAppBilling).toHaveAttribute('data-state', 'unchecked');
  });

  it('fires the PATCH mutation with just the one toggled field, not the whole object', async () => {
    vi.mocked(notificationsApi.getPreferences).mockResolvedValue(PREFERENCES);
    vi.mocked(notificationsApi.updatePreferences).mockResolvedValue({ ...PREFERENCES, emailBilling: true });
    const user = userEvent.setup();
    renderWithProviders(<NotificationPreferencesSection />);

    const emailBilling = await screen.findByRole('checkbox', { name: 'Email notifications for Billing' });
    await user.click(emailBilling);

    await waitFor(() => expect(notificationsApi.updatePreferences).toHaveBeenCalledWith({ emailBilling: true }));
    expect(notificationsApi.updatePreferences).toHaveBeenCalledTimes(1);
  });

  it('shows a danger toast when the mutation fails', async () => {
    vi.mocked(notificationsApi.getPreferences).mockResolvedValue(PREFERENCES);
    vi.mocked(notificationsApi.updatePreferences).mockRejectedValue(
      new ApiError(500, { code: 'internal_error', message: 'Update failed', requestId: 'req-1', timestamp: new Date().toISOString() }),
    );
    const user = userEvent.setup();
    renderWithProviders(<NotificationPreferencesSection />);

    const emailBilling = await screen.findByRole('checkbox', { name: 'Email notifications for Billing' });
    await user.click(emailBilling);

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'danger', description: 'Update failed' })),
    );
  });

  it('disables a toggle while its own mutation is in flight, without disabling the others', async () => {
    vi.mocked(notificationsApi.getPreferences).mockResolvedValue(PREFERENCES);
    let resolveUpdate: (value: NotificationPreferences) => void = () => {};
    vi.mocked(notificationsApi.updatePreferences).mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = resolve;
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<NotificationPreferencesSection />);

    const emailBilling = await screen.findByRole('checkbox', { name: 'Email notifications for Billing' });
    const emailAppointments = screen.getByRole('checkbox', { name: 'Email notifications for Appointments' });
    await user.click(emailBilling);

    expect(emailBilling).toBeDisabled();
    expect(emailAppointments).not.toBeDisabled();

    resolveUpdate({ ...PREFERENCES, emailBilling: true });
    await waitFor(() => expect(emailBilling).not.toBeDisabled());
  });
});
