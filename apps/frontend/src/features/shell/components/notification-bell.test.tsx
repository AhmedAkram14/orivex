import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { NotificationBell } from '@/features/shell/components/notification-bell';
import { server } from '@/mocks/server';
import { resetNotifications } from '@/mocks/notifications-store';
import { env } from '@/shared/lib/env';
import { NOTIFICATIONS_PATHS } from '@/features/notifications/api/paths';
import enMessages from '../../../../messages/en.json';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetNotifications();
});
afterAll(() => server.close());

function renderBell() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <NotificationBell />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('NotificationBell + NotificationPanel', () => {
  it('shows an unread-count badge that reflects the mock notification data', async () => {
    renderBell();
    // Two of the three mock notifications start unread (see notifications-store.ts).
    expect(await screen.findByText('2')).toBeInTheDocument();
  });

  it('lists notifications in the panel, and opening the bell marks them all read and clears the badge', async () => {
    renderBell();
    await screen.findByText('2');

    await userEvent.click(screen.getByRole('button', { name: /Notifications/ }));

    expect(await screen.findByText('Welcome to Orivex')).toBeInTheDocument();
    expect(screen.getByText('New device signed in')).toBeInTheDocument();

    await waitFor(() => expect(screen.queryByText('2')).not.toBeInTheDocument());
    expect(screen.queryByText('1')).not.toBeInTheDocument();
    // Nothing left to mark: the explicit action disappears with the unread count.
    expect(screen.queryByRole('button', { name: 'Mark all as read' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('renders a notification with an actionUrl as a real link to that page, marking it as read on click', async () => {
    server.use(
      http.get(`${env.apiBaseUrl}${NOTIFICATIONS_PATHS.list}`, () =>
        HttpResponse.json({
          data: [
            {
              id: 'notification-case-1',
              title: 'Verification rejected',
              description: 'Your professional verification application was rejected.',
              severity: 'danger',
              createdAt: new Date().toISOString(),
              read: false,
              actionUrl: '/doctor/onboarding',
            },
          ],
        }),
      ),
    );

    renderBell();
    await userEvent.click(screen.getByRole('button', { name: /Notifications/ }));

    const link = await screen.findByRole('link', { name: /Verification rejected/ });
    expect(link).toHaveAttribute('href', '/en/doctor/onboarding');
  });

  it('keeps the badge cleared when the bell is closed and reopened', async () => {
    renderBell();
    await screen.findByText('2');

    await userEvent.click(screen.getByRole('button', { name: /Notifications/ }));
    await waitFor(() => expect(screen.queryByText('2')).not.toBeInTheDocument());
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'Notifications' }));

    expect(await screen.findByText('Welcome to Orivex')).toBeInTheDocument();
    expect(screen.queryByText('2')).not.toBeInTheDocument();
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });
});
