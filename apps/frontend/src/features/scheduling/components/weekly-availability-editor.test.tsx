import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SCHEDULING_PATHS } from '@/features/scheduling/api/paths';
import type { RecurringWeeklySchedule } from '@/features/scheduling/types';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import baseline from './__fixtures__/weekly-availability-baseline.json';
import { WeeklyAvailabilityDialog } from './weekly-availability-dialog';
import { WeeklyAvailabilityEditor } from './weekly-availability-editor';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Every day 9 AM - 5 PM; six days Paid 320 EGP, Friday Free; one break on Sunday (see the fixture's own header).
const fixture = baseline.fixture as RecurringWeeklySchedule;

/** Captures the exact PATCH bodies the editor sends. */
function captureSaves() {
  const bodies: string[] = [];
  server.use(
    http.patch(`${env.apiBaseUrl}${SCHEDULING_PATHS.doctorAvailability}`, async ({ request }) => {
      const text = await request.text();
      bodies.push(text);
      return HttpResponse.json({ data: JSON.parse(text) });
    }),
  );
  return bodies;
}

function renderEditor() {
  const onSaved = vi.fn();
  renderWithProviders(
    <WeeklyAvailabilityEditor
      schedule={fixture}
      onSaved={onSaved}
      onCancel={() => {}}
      layout="table"
    />,
  );
  return { onSaved };
}

const row = (day: string) => document.querySelector<HTMLElement>(`[data-day-row="${day}"]`)!;
const save = () => screen.getByRole('button', { name: 'Save changes' });

describe('WeeklyAvailabilityEditor', () => {
  it('opens on the defaults: six days "Default", Friday its own price with the accent bar', () => {
    renderEditor();
    expect(
      screen.getAllByRole('listitem').filter((item) => item.hasAttribute('data-day-row')),
    ).toHaveLength(7);
    expect(
      within(row('friday')).getByRole('button', { name: 'Friday price: Free' }),
    ).toBeInTheDocument();
    expect(
      within(row('monday')).getByRole('button', { name: 'Monday price: Default' }),
    ).toBeInTheDocument();
    expect(row('friday')).toHaveAttribute('data-override');
    expect(row('monday')).not.toHaveAttribute('data-override');
    // Nothing changed yet: Save is off.
    expect(save()).toBeDisabled();
    expect(
      screen.getByText(/7 working days · 55 h\/week · 1 day with custom price/),
    ).toBeInTheDocument();
  });

  it('round trip: Friday Paid 450 and a Monday break send exactly what the old form sent for the same edit', async () => {
    const bodies = captureSaves();
    const { onSaved } = renderEditor();
    const user = userEvent.setup();

    await user.click(within(row('friday')).getByRole('button', { name: 'Friday price: Free' }));
    await user.click(
      within(screen.getByRole('group', { name: 'Friday pricing' })).getByRole('button', {
        name: 'Paid',
      }),
    );
    await user.type(screen.getByLabelText('Friday consultation fee'), '450');
    await user.click(screen.getByRole('button', { name: 'Done' }));

    await user.click(within(row('monday')).getByRole('button', { name: 'Add a break on Monday' }));
    await user.click(screen.getByRole('button', { name: 'Add break' }));

    await user.click(save());
    await vi.waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toBe(baseline.edited);
    expect(onSaved).toHaveBeenCalled();
  });

  it('a day switched off collapses to "Unavailable" and the summary follows', async () => {
    renderEditor();
    const user = userEvent.setup();
    await user.click(screen.getByRole('switch', { name: 'Saturday working day' }));
    expect(within(row('saturday')).getByText('Unavailable')).toBeInTheDocument();
    expect(within(row('saturday')).queryByLabelText('Saturday start time')).not.toBeInTheDocument();
    expect(screen.getByText(/6 working days · 47 h\/week/)).toBeInTheDocument();
    expect(save()).toBeEnabled();
  });

  it('removing a break chip; "Use default" puts a custom price back on the default', async () => {
    renderEditor();
    const user = userEvent.setup();
    await user.click(
      within(row('sunday')).getByRole('button', { name: /Remove the .* break on Sunday/ }),
    );
    expect(row('sunday').querySelector('[data-break-chip]')).toBeNull();

    await user.click(within(row('friday')).getByRole('button', { name: 'Friday price: Free' }));
    await user.click(screen.getByRole('button', { name: 'Use default' }));
    expect(
      within(row('friday')).getByRole('button', { name: 'Friday price: Default' }),
    ).toBeInTheDocument();
    expect(row('friday')).not.toHaveAttribute('data-override');
  });

  it('Copy to… copies a day onto the days picked (by keyboard)', async () => {
    renderEditor();
    const user = userEvent.setup();
    within(row('sunday')).getByRole('button', { name: 'Sunday actions' }).focus();
    await user.keyboard('{Enter}');
    // "Copy to…" has focus; the arrow opens its day list on the first day (Monday).
    expect(await screen.findByRole('menuitem', { name: 'Copy to…' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(await screen.findByRole('menuitemcheckbox', { name: 'Monday' })).toHaveFocus();
    // Space ticks a day and keeps the list open; End reaches "Copy".
    await user.keyboard(' ');
    expect(screen.getByRole('menuitemcheckbox', { name: 'Monday' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await user.keyboard('{End}');
    expect(screen.getByRole('menuitem', { name: 'Copy to 1 day' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(row('monday').querySelectorAll('[data-break-chip]')).toHaveLength(1);
  });

  it('an invalid row says why under itself and keeps Save off', async () => {
    renderEditor();
    const user = userEvent.setup();
    const end = screen.getByLabelText('Monday end time');
    await user.clear(end);
    await user.type(end, '08:00');
    expect(
      within(row('monday')).getByText('End time must be after the start time.'),
    ).toBeInTheDocument();
    expect(end).toHaveAttribute('aria-invalid', 'true');
    expect(save()).toBeDisabled();
  });
});

describe('WeeklyAvailabilityDialog', () => {
  it('closing with unsaved edits asks "Discard changes?" first', async () => {
    const onOpenChange = vi.fn();
    renderWithProviders(
      <WeeklyAvailabilityDialog open onOpenChange={onOpenChange} schedule={fixture} />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('switch', { name: 'Saturday working day' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByText('Discard changes?')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Discard' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes straight away when nothing changed', async () => {
    const onOpenChange = vi.fn();
    renderWithProviders(
      <WeeklyAvailabilityDialog open onOpenChange={onOpenChange} schedule={fixture} />,
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Discard changes?')).not.toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
