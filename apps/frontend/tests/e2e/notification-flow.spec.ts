import { expect, test } from '@playwright/test';

import { loginAs } from './support/login.js';

test.describe('Notification flow', () => {
  test('shows the unread badge, lists notifications, and marks one as read', async ({ page }) => {
    await loginAs(page, 'patient');

    // Two of the three seeded mock notifications start unread
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
    await expect(panel.getByText('New device signed in', { exact: true })).toBeVisible();

    await panel.getByText('Welcome to Orivex', { exact: true }).click();

    await expect(bell.getByText('2')).not.toBeVisible();
    await expect(bell.getByText('1')).toBeVisible();
  });

  test('marks every notification as read via "Mark all as read"', async ({ page }) => {
    await loginAs(page, 'patient');

    const bell = page.getByRole('button', { name: /Notifications/ });
    await expect(bell.getByText('2')).toBeVisible();
    await bell.click();

    const panel = page.getByRole('dialog');
    await expect(panel.getByText('Welcome to Orivex', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Mark all as read' }).click();

    await expect(bell.getByText('2')).not.toBeVisible();
    await expect(bell.getByText('1')).not.toBeVisible();
  });
});
