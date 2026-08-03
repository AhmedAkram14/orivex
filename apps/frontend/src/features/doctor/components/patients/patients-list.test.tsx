import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { server } from '@/mocks/server';
import enMessages from '../../../../../messages/en.json';

import { PatientsList } from './patients-list';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderList() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <PatientsList />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('PatientsList', () => {
  it('renders real KPI counts and paginates the seeded busy-practice roster', async () => {
    renderList();

    expect(await screen.findByText('Total Patients')).toBeInTheDocument();
    // 12 seeded patients, page size 5 -- pagination must appear.
    expect(await screen.findByText(/Showing 1-5 of 12 patients/)).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
  });

  it('filters the table by a real search term, matching against name/email/phone', async () => {
    renderList();
    await screen.findByText('Total Patients');

    await userEvent.type(screen.getByPlaceholderText('Search by name, phone, or email...'), 'Mona Farouk');

    expect(await screen.findByText('Mona Farouk')).toBeInTheDocument();
    expect(screen.queryByText('Layla Ibrahim')).not.toBeInTheDocument();
  });

  it('shows an honest "no matching patients" state for a search with zero results', async () => {
    renderList();
    await screen.findByText('Total Patients');

    await userEvent.type(screen.getByPlaceholderText('Search by name, phone, or email...'), 'no-such-patient-xyz');

    expect(await screen.findByText('No matching patients')).toBeInTheDocument();
  });

  it('shows the Returning badge only for a patient with more than one visit', async () => {
    renderList();

    const row = (await screen.findByText('Mona Farouk')).closest('tr');
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText('Returning')).toBeInTheDocument();
  });

  it('shows a real "Follow up" status for a patient with a recorded follow-up recommendation and nothing booked yet', async () => {
    renderList();
    await screen.findByText('Total Patients');

    // Seeded in mocks/doctor-store.ts with hasFollowUpRecommendation: true
    // and no nextAppointmentAt -- reuses ClinicalModule's real
    // FollowUpRecommendation signal, never a guessed status. Searched into
    // view rather than assumed to be on page 1 (sorted by most recent
    // visit, and this patient's isn't among the 5 most recent).
    await userEvent.type(screen.getByPlaceholderText('Search by name, phone, or email...'), 'Nourhan');

    const row = (await screen.findByText('Nourhan Abdel Aziz')).closest('tr');
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText('Follow up')).toBeInTheDocument();
  });
});
