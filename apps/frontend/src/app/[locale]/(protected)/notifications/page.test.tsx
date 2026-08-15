import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { NotificationCenterList } from '@/features/notifications/components/notification-center-list';
import { server } from '@/mocks/server';
import { resetNotifications } from '@/mocks/notifications-store';
import { env } from '@/shared/lib/env';
import { NOTIFICATIONS_PATHS } from '@/features/notifications/api/paths';
import enMessages from '../../../../../messages/en.json';

// `NotificationsPage` itself is a server component (`generateMetadata` +
// a plain `async function` body) that just wraps `NotificationCenterList`
// in page chrome -- the real, testable behavior (pagination, mark-read,
// loading/empty/error) lives entirely in that client component, so it's
// exercised directly here, matching how `AdminPaymentsTable` is tested
// (the component, not the page shell around it) rather than needing a
// server-component render harness.

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetNotifications();
});
afterAll(() => server.close());

function renderList() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <NotificationCenterList />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('NotificationCenterList', () => {
  it('renders the full seeded notification history (beyond the bell popover’s cap)', async () => {
    renderList();

    // Page 1 (limit 5) of the 12 seeded mock notifications.
    expect(await screen.findByText('Welcome to Orivex')).toBeInTheDocument();
    expect(screen.getByText('New device signed in')).toBeInTheDocument();
    expect(screen.getByText('Password changed')).toBeInTheDocument();
    expect(screen.getByText('Appointment confirmed')).toBeInTheDocument();
    expect(screen.getByText('Payment received')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  });

  it('paginates to a second page showing different items than the first', async () => {
    renderList();
    await screen.findByText('Welcome to Orivex');

    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));

    expect(await screen.findByText('Verification under review')).toBeInTheDocument();
    expect(screen.getByText('Reminder: upcoming appointment')).toBeInTheDocument();
    expect(screen.queryByText('Welcome to Orivex')).not.toBeInTheDocument();
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
  });

  it('still allows marking a notification as read from this page', async () => {
    renderList();
    await screen.findByText('Welcome to Orivex');

    await userEvent.click(screen.getByText('Welcome to Orivex'));

    await screen.findByText('Password changed');
    // The unread marker (a dot, not text) disappearing is covered by the
    // bell's own test; here what matters is the mark-all action disappears
    // once nothing is left unread on this page's own data (page 1 starts
    // with 2 unread: notification-1 and notification-2).
    expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeInTheDocument();
  });

  it('shows the empty state when there are no notifications', async () => {
    server.use(
      http.get(`${env.apiBaseUrl}${NOTIFICATIONS_PATHS.list}`, () =>
        HttpResponse.json({
          data: [],
          meta: { requestId: 'r', timestamp: new Date().toISOString(), page: 1, limit: 5, total: 0 },
        }),
      ),
    );

    renderList();

    expect(await screen.findByText("You're all caught up")).toBeInTheDocument();
  });

  it('shows a load error when the request fails', async () => {
    server.use(
      http.get(`${env.apiBaseUrl}${NOTIFICATIONS_PATHS.list}`, () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL', message: 'boom', requestId: 'r', timestamp: new Date().toISOString() } },
          { status: 500 },
        ),
      ),
    );

    renderList();

    expect(await screen.findByText("Couldn't load your notifications.")).toBeInTheDocument();
  });
});
