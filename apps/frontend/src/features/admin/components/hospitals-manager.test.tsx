import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { HospitalsManager } from './hospitals-manager';
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

function renderManager() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <HospitalsManager />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('HospitalsManager', () => {
  it('shows the empty state when there are no hospitals yet', async () => {
    renderManager();

    expect(await screen.findByText('No hospitals yet')).toBeInTheDocument();
  });

  it('creates a hospital and shows success feedback', async () => {
    renderManager();
    await screen.findByText('No hospitals yet');

    await userEvent.type(screen.getByLabelText('Name'), 'Cairo General');
    await userEvent.click(screen.getByRole('button', { name: 'Add hospital' }));

    await waitFor(() => expect(screen.getByText('Hospital created.')).toBeInTheDocument());
    expect(await screen.findByText('Cairo General')).toBeInTheDocument();
  });

  it('shows a create error without success feedback when the hospital create request fails', async () => {
    server.use(
      http.post(`${base()}/admin/hospitals`, () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL', message: 'boom', requestId: 'r', timestamp: new Date().toISOString() } },
          { status: 500 },
        ),
      ),
    );

    renderManager();
    await screen.findByText('No hospitals yet');

    await userEvent.type(screen.getByLabelText('Name'), 'Cairo General');
    await userEvent.click(screen.getByRole('button', { name: 'Add hospital' }));

    await waitFor(() => expect(screen.getByText('Could not create this hospital.')).toBeInTheDocument());
    expect(screen.queryByText('Hospital created.')).not.toBeInTheDocument();
  });

  it('creates a department under a hospital and shows success feedback', async () => {
    renderManager();
    await screen.findByText('No hospitals yet');

    await userEvent.type(screen.getByLabelText('Name'), 'Cairo General');
    await userEvent.click(screen.getByRole('button', { name: 'Add hospital' }));
    await screen.findByText('Cairo General');

    await userEvent.click(screen.getByText('Cairo General'));
    await screen.findByText('No departments yet.');

    await userEvent.type(screen.getByLabelText('Department name'), 'Cardiology');
    await userEvent.click(screen.getByRole('button', { name: 'Add department' }));

    await waitFor(() => expect(screen.getByText('Department created.')).toBeInTheDocument());
    expect(await screen.findByText('Cardiology')).toBeInTheDocument();
  });
});
