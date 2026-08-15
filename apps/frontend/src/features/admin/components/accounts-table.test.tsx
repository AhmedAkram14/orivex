import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { AccountsTable } from './accounts-table';
import { resetAdminStore } from '@/mocks/admin-store';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';
import enMessages from '../../../../messages/en.json';

const base = () => env.apiBaseUrl;

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetAdminStore();
});
afterAll(() => server.close());

function renderTable() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <AccountsTable />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('AccountsTable', () => {
  it('lists the seeded accounts', async () => {
    renderTable();

    expect(await screen.findByText('Dr. Amina Hassan')).toBeInTheDocument();
    expect(screen.getByText('Youssef Ibrahim')).toBeInTheDocument();
  });

  it('filters server-side by role -- asserts the real querystring sent, not a client-side filter', async () => {
    const requestedUrls: string[] = [];
    server.events.on('request:start', ({ request }) => {
      if (request.url.includes('/admin/accounts')) requestedUrls.push(request.url);
    });

    renderTable();
    await screen.findByText('Dr. Amina Hassan');
    expect(screen.getByText('Youssef Ibrahim')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('combobox', { name: 'Filter by role' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Doctor' }));

    await waitFor(() => {
      expect(requestedUrls.some((url) => url.includes('role=doctor'))).toBe(true);
    });
    await waitFor(() => {
      expect(screen.queryByText('Youssef Ibrahim')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Dr. Amina Hassan')).toBeInTheDocument();
  });

  it('requires confirmation before changing a role, and does not fire the mutation until confirmed', async () => {
    renderTable();
    await screen.findByText('Dr. Amina Hassan');

    const roleSelects = screen.getAllByRole('combobox').filter((el) => el.getAttribute('aria-label') !== 'Filter by role');
    await userEvent.click(roleSelects[0]);
    await userEvent.click(await screen.findByRole('option', { name: 'Nurse' }));

    expect(await screen.findByText('Change this account’s role?')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Change this account’s role?')).not.toBeInTheDocument();
    expect(screen.queryByText('Role updated.')).not.toBeInTheDocument();
  });

  it('changes a role through the confirm dialog and shows success feedback', async () => {
    renderTable();
    await screen.findByText('Dr. Amina Hassan');

    const roleSelects = screen.getAllByRole('combobox').filter((el) => el.getAttribute('aria-label') !== 'Filter by role');
    await userEvent.click(roleSelects[0]);
    await userEvent.click(await screen.findByRole('option', { name: 'Nurse' }));

    await screen.findByText('Change this account’s role?');
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(screen.getByText('Role updated.')).toBeInTheDocument());
    expect(screen.queryByText('Change this account’s role?')).not.toBeInTheDocument();
  });

  it('shows a role-update error without a success message when the mutation fails', async () => {
    server.use(
      http.patch(`${base()}/admin/accounts/:id/role`, () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL', message: 'boom', requestId: 'r', timestamp: new Date().toISOString() } },
          { status: 500 },
        ),
      ),
    );

    renderTable();
    await screen.findByText('Dr. Amina Hassan');

    const roleSelects = screen.getAllByRole('combobox').filter((el) => el.getAttribute('aria-label') !== 'Filter by role');
    await userEvent.click(roleSelects[0]);
    await userEvent.click(await screen.findByRole('option', { name: 'Nurse' }));
    await screen.findByText('Change this account’s role?');
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(screen.getByText('Could not update this account’s role.')).toBeInTheDocument());
    expect(screen.queryByText('Role updated.')).not.toBeInTheDocument();
  });

  it('shows a load error when the accounts request fails', async () => {
    server.use(
      http.get(`${base()}/admin/accounts`, () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL', message: 'boom', requestId: 'r', timestamp: new Date().toISOString() } },
          { status: 500 },
        ),
      ),
    );

    renderTable();

    expect(await screen.findByText('Could not load accounts.')).toBeInTheDocument();
  });
});
