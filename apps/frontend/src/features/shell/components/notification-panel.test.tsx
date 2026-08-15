import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { NotificationPanel } from '@/features/shell/components/notification-panel';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { server } from '@/mocks/server';
import { resetNotifications } from '@/mocks/notifications-store';
import { env } from '@/shared/lib/env';
import { NOTIFICATIONS_PATHS } from '@/features/notifications/api/paths';
import type { NotificationSeverity } from '@/features/notifications/api/types';
import enMessages from '../../../../messages/en.json';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetNotifications();
});
afterAll(() => server.close());

function mockNotificationsBySeverity() {
  const severities: NotificationSeverity[] = ['info', 'success', 'warning', 'danger'];
  server.use(
    http.get(`${env.apiBaseUrl}${NOTIFICATIONS_PATHS.list}`, () =>
      HttpResponse.json({
        data: severities.map((severity, index) => ({
          id: `notification-severity-${severity}`,
          title: `${severity} notification`,
          description: `A ${severity} notification.`,
          severity,
          createdAt: new Date(Date.now() - index * 3_600_000).toISOString(),
          read: false,
        })),
        meta: { requestId: 'r', timestamp: new Date().toISOString(), page: 1, limit: 50, total: severities.length },
      }),
    ),
  );
}

// `NotificationPanel` always renders open (no popover chrome of its own) --
// the real bell wraps it in a `Popover`, so tests mirror that shell exactly,
// matching `notification-bell.test.tsx`'s own convention.
function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <Popover defaultOpen>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>
            <NotificationPanel />
          </PopoverContent>
        </Popover>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('NotificationPanel severity icons', () => {
  it.each<[NotificationSeverity, string]>([
    ['info', 'text-info'],
    ['success', 'text-success'],
    ['warning', 'text-warning'],
    ['danger', 'text-danger'],
  ])('renders the %s severity icon with the Alert-matching %s token', async (severity, colorClass) => {
    mockNotificationsBySeverity();
    renderPanel();

    await screen.findByText(`${severity} notification`);

    const row = screen.getByText(`${severity} notification`).closest('li');
    expect(row).not.toBeNull();
    const icon = row!.querySelector(`svg.${colorClass}`);
    expect(icon).not.toBeNull();
  });

  it('has a "View all" link to the Notification Center page', async () => {
    renderPanel();
    await screen.findByText('Welcome to Orivex');

    const link = screen.getByRole('link', { name: 'View all notifications' });
    expect(link).toHaveAttribute('href', '/en/notifications');
  });
});
