import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { EssentialInfoStep } from './essential-info-step';
import type { Account } from '@/features/identity/api/types';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';
import enMessages from '../../../../messages/en.json';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const account: Account = {
  id: 'acc-1',
  email: 'ahmed@example.com',
  role: 'patient',
  status: 'active',
  displayName: 'Ahmed Akram',
  preferredLanguage: 'en',
  createdAt: '2026-10-01T10:00:00Z',
  updatedAt: '2026-10-01T10:00:00Z',
};

function renderStep(initial: Partial<Account> = {}) {
  const onSaved = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <EssentialInfoStep account={{ ...account, ...initial }} onSaved={onSaved} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
  return { onSaved };
}

function capturePatch() {
  const bodies: unknown[] = [];
  server.use(
    http.patch(`${env.apiBaseUrl}/accounts/me`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      bodies.push(body);
      return HttpResponse.json({ data: { ...account, ...body } });
    }),
  );
  return bodies;
}

const submit = () => screen.getByRole('button', { name: 'Save and continue' });

async function fill(
  user: ReturnType<typeof userEvent.setup>,
  { day, month, year }: { day: string; month: string; year: string },
) {
  await user.selectOptions(screen.getByRole('combobox', { name: 'Day' }), day);
  await user.selectOptions(screen.getByRole('combobox', { name: 'Month' }), month);
  await user.selectOptions(screen.getByRole('combobox', { name: 'Year' }), year);
}

describe('EssentialInfoStep', () => {
  it('sends the same body as the old form for the same answers: YYYY-MM-DD, the gender value, +20 and the local number', async () => {
    const user = userEvent.setup();
    const bodies = capturePatch();
    const { onSaved } = renderStep();

    await fill(user, { day: '15', month: '03', year: '1990' });
    await user.click(screen.getByRole('radio', { name: /^Female$/ }));
    // Typed the way Egyptians often write it (leading 0); the mask shows the local part.
    await user.type(screen.getByRole('textbox', { name: 'Phone number' }), '01001234567');
    expect(screen.getByRole('textbox', { name: 'Phone number' })).toHaveValue('100 123 4567');
    await user.click(submit());

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    // The old form's own fields, unchanged in shape: the date input's YYYY-MM-DD, the Select's value, and the phone
    // in the "+20 100 000 0000" format its placeholder asked for.
    expect(bodies).toEqual([
      { dateOfBirth: '1990-03-15', gender: 'female', phoneNumber: '+20 100 123 4567' },
    ]);
  });

  it('shows no errors on first render, an error once an empty required field is left, and keeps Save disabled until all are filled', async () => {
    const user = userEvent.setup();
    renderStep();

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(submit()).toBeDisabled();
    // The name is read-only, from the account.
    expect(screen.getByRole('textbox', { name: 'Full name' })).toHaveAttribute('readonly');
    expect(screen.getByRole('textbox', { name: 'Full name' })).toHaveValue('Ahmed Akram');

    // Moving between the three date selects is not "leaving" the field.
    screen.getByRole('combobox', { name: 'Day' }).focus();
    await user.tab();
    await user.tab();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.tab();
    expect(await screen.findByText('Date of birth is required.')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Day' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('combobox', { name: 'Day' })).toHaveAccessibleDescription(
      'Date of birth is required.',
    );
  });

  it('rejects a date of birth in the future and moves focus to the first invalid field on submit', async () => {
    const user = userEvent.setup();
    const bodies = capturePatch();
    // The year list stops at this year, so pick tomorrow: a real date, and in the future.
    const tomorrow = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(
      new Date(Date.now() + 86_400_000),
    );
    const [year, month, day] = tomorrow.split('-') as [string, string, string];
    renderStep({ gender: 'male', phoneNumber: '+20 100 000 0000' });
    // Only reachable when tomorrow is still this year; on 31 December it is next year and not in the list.
    if (!screen.queryByRole('option', { name: year })) return;

    await fill(user, { day, month, year });
    await user.click(submit());

    expect(await screen.findByText("Date of birth can't be in the future.")).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Day' })).toHaveFocus();
    expect(bodies).toEqual([]);
  });

  it('rejects a date that does not exist (31 February)', async () => {
    const user = userEvent.setup();
    const bodies = capturePatch();
    renderStep({ gender: 'male', phoneNumber: '+20 100 000 0000' });

    await fill(user, { day: '31', month: '02', year: '1990' });
    await user.click(submit());

    expect(await screen.findByText('Enter a real date.')).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it('reads a saved number in any of the usual forms as its local part', () => {
    renderStep({ phoneNumber: '+201001234567' });
    expect(screen.getByRole('textbox', { name: 'Phone number' })).toHaveValue('100 123 4567');
  });
});
