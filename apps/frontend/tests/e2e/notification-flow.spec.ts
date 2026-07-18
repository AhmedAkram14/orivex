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

    await expect(page.getByText('Welcome to Orivex', { exact: true })).toBeVisible();
    await expect(page.getByText('New device signed in', { exact: true })).toBeVisible();

    await page.getByText('Welcome to Orivex', { exact: true }).click();

    await expect(bell.getByText('2')).not.toBeVisible();
    await expect(bell.getByText('1')).toBeVisible();
  });

  test('marks every notification as read via "Mark all as read"', async ({ page }) => {
    await loginAs(page, 'patient');

    const bell = page.getByRole('button', { name: /Notifications/ });
    await expect(bell.getByText('2')).toBeVisible();
    await bell.click();

    await expect(page.getByText('Welcome to Orivex')).toBeVisible();
    await page.getByRole('button', { name: 'Mark all as read' }).click();

    await expect(bell.getByText('2')).not.toBeVisible();
    await expect(bell.getByText('1')).not.toBeVisible();
  });
});
