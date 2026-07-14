import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { NotificationBell } from '@/features/shell/components/notification-bell';
import { server } from '@/mocks/server';
import { resetNotifications } from '@/mocks/notifications-store';
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

  it('lists notifications in the panel and lets the user mark one as read', async () => {
    renderBell();
    await screen.findByText('2');

    await userEvent.click(screen.getByRole('button', { name: /Notifications/ }));

    expect(await screen.findByText('Welcome to Orivex')).toBeInTheDocument();
    expect(screen.getByText('New device signed in')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Welcome to Orivex'));

    await waitFor(() => expect(screen.queryByText('2')).not.toBeInTheDocument());
    expect(await screen.findByText('1')).toBeInTheDocument();
  });

  it('marks every notification as read via "Mark all as read"', async () => {
    renderBell();
    await screen.findByText('2');

    await userEvent.click(screen.getByRole('button', { name: /Notifications/ }));
    await screen.findByText('Welcome to Orivex');
    await userEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));

    await waitFor(() => expect(screen.queryByText('2')).not.toBeInTheDocument());
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });
});
