import { expect, test } from '@playwright/test';

import { loginAs } from './support/login.js';

test.describe('Notification flow', () => {
  test('shows the unread badge, lists notifications, and opening the bell marks them all read', async ({ page }) => {
    await loginAs(page, 'patient');

    // Two of the seeded mock notifications start unread
    // (src/mocks/notifications-store.ts).
    const bell = page.getByRole('button', { name: /Notifications/ });
    await expect(bell.getByText('2')).toBeVisible();

    await bell.click();

    // The Patient Dashboard's own "Recent Activity" widget now also
    // surfaces real notifications in the page's <main>, so a page-wide text
    // search finds the same "Welcome to Orivex" twice -- scope to the
    // bell's popover panel (a Radix Popover.Content, role="dialog") to
    // disambiguate.
    const panel = page.getByRole('dialog');
    await expect(panel.getByText('Welcome to Orivex', { exact: true })).toBeVisible();
    await expect(panel.getByText('Verification approved', { exact: true })).toBeVisible();

    // Since 2026-09-24 opening the bell marks everything read and clears the badge
    // (NotificationBell), so there is nothing left for a "Mark all as read" action.
    await expect(bell.getByText('2')).not.toBeVisible();
    await expect(bell.getByText('1')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Mark all as read' })).toHaveCount(0);
  });
});
