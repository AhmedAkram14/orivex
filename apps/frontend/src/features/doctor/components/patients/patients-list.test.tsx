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

// Phase 7 (Responsive) note: below `md` the component now also renders a
// `md:hidden` card-list alternative to the table with the same patient data
// (see patients-list.tsx) so there's no horizontal scroll at 390px. jsdom
// doesn't evaluate the `hidden md:block` / `md:hidden` media-query classes,
// so both the table and the card list are simultaneously present in the DOM
// during tests -- every query below that looks up a patient by name is
// scoped to the desktop table (`data-testid="patients-table"`) so it keeps
// resolving to exactly one match, the same way it did before this phase.
describe('PatientsList', () => {
  it('renders real KPI counts and the full seeded roster on one page (page size 25)', async () => {
    renderList();

    expect(await screen.findByText('Total Patients')).toBeInTheDocument();
    // 12 seeded patients, page size 25 -- all fit on one page. Rendered
    // twice (once in the desktop table's footer, once in the `md:hidden`
    // card list's own footer -- jsdom doesn't evaluate either's media-query
    // class, see the describe-block comment above), so this asserts there
    // are exactly two identical matches rather than picking one arbitrarily.
    expect(await screen.findAllByText(/Showing 1-12 of 12 patients/)).toHaveLength(2);
    // Regression: "Last Visit" used to be the most recently *scheduled*
    // appointment regardless of status, so a Cancelled/still-pending
    // appointment's date rendered as `new Date(undefined)` once the backend
    // started omitting it for a patient with no completed visit -- never a
    // silent "Invalid Date" anywhere on the page.
    expect(screen.queryByText('Invalid Date')).not.toBeInTheDocument();
  });

  it('clears the search field via the clear button', async () => {
    renderList();
    await screen.findByText('Total Patients');

    const table = await screen.findByTestId('patients-table');
    const searchInput = screen.getByPlaceholderText('Search patients...');
    await userEvent.type(searchInput, 'Mona Farouk');
    expect(await within(table).findByText('Mona Farouk')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(searchInput).toHaveValue('');
    expect(await within(table).findByText('Layla Ibrahim')).toBeInTheDocument();
  });

  it('filters the table by a real search term, matching against name/email/phone', async () => {
    renderList();
    await screen.findByText('Total Patients');

    const table = await screen.findByTestId('patients-table');
    await userEvent.type(screen.getByPlaceholderText('Search patients...'), 'Mona Farouk');

    expect(await within(table).findByText('Mona Farouk')).toBeInTheDocument();
    expect(within(table).queryByText('Layla Ibrahim')).not.toBeInTheDocument();
  });

  it('shows an honest "no matching patients" state for a search with zero results', async () => {
    renderList();
    await screen.findByText('Total Patients');

    await userEvent.type(screen.getByPlaceholderText('Search patients...'), 'no-such-patient-xyz');

    expect(await screen.findByText('No matching patients')).toBeInTheDocument();
  });

  it('shows the Returning badge only for a patient with more than one visit', async () => {
    renderList();

    const table = await screen.findByTestId('patients-table');
    const row = (await within(table).findByText('Mona Farouk')).closest('tr');
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText('Returning')).toBeInTheDocument();
  });

  it('shows a real "Follow up" status for a patient with a recorded follow-up recommendation and nothing booked yet', async () => {
    renderList();
    await screen.findByText('Total Patients');

    const table = await screen.findByTestId('patients-table');
    // Seeded in mocks/doctor-store.ts with hasFollowUpRecommendation: true
    // and no nextAppointmentAt -- reuses ClinicalModule's real
    // FollowUpRecommendation signal, never a guessed status. Searched into
    // view rather than assumed to be on page 1 (sorted by most recent
    // visit, and this patient's isn't among the 5 most recent).
    await userEvent.type(screen.getByPlaceholderText('Search patients...'), 'Nourhan');

    const row = (await within(table).findByText('Nourhan Abdel Aziz')).closest('tr');
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText('Follow up')).toBeInTheDocument();
  });
});
