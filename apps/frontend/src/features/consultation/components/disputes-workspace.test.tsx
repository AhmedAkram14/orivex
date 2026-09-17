import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';
import type { AuthState } from '@/shared/auth/types';

import { DisputesWorkspace } from './disputes-workspace';

const base = () => env.apiBaseUrl;

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const RAISER_ACCOUNT_ID = 'patient-account-1';
const COUNTERPARTY_ACCOUNT_ID = 'doctor-account-1';

const patientAuthState: AuthState = {
  status: 'authenticated',
  user: { id: RAISER_ACCOUNT_ID, email: 'patient@orivex.dev', fullName: 'Amina Youssef', roles: ['patient'] },
};

function appointment(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'appointment-1',
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    doctorId: 'doctor-1',
    doctorName: 'Dr. Sarah Ahmed',
    specialization: 'Cardiology',
    specializationAr: null,
    status: 'confirmed',
    consultationType: 'paid',
    consultationSessionId: null,
    paymentRequired: false,
    feeAmount: null,
    ...overrides,
  };
}

function dispute(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'dispute-1',
    appointmentId: 'appointment-1',
    raisedByAccountId: RAISER_ACCOUNT_ID,
    reason: 'The doctor never joined the call at the scheduled time and I waited for twenty minutes.',
    category: 'no_show',
    attachmentAssetId: null,
    status: 'open',
    resolutionNotes: null,
    resolvedByAccountId: null,
    resolvedAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function mockAppointments(list: ReturnType<typeof appointment>[]) {
  server.use(http.get(`${base()}/appointments/me`, () => HttpResponse.json({ data: list })));
}

function mockDisputes(list: ReturnType<typeof dispute>[]) {
  server.use(http.get(`${base()}/disputes`, () => HttpResponse.json({ data: list })));
}

function renderWorkspace(authState: AuthState = patientAuthState) {
  return renderWithProviders(<DisputesWorkspace role="patient" />, { authState });
}

const VALID_REASON = 'The doctor never joined the call and I waited for over twenty minutes total.';

async function openRaiseDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Raise a dispute' }));
  const dialog = await screen.findByRole('dialog');
  await user.click(within(dialog).getByRole('combobox', { name: 'Appointment' }));
  await user.click(await screen.findByRole('option', { name: /Dr\. Sarah Ahmed/ }));
}

describe('DisputesWorkspace heading hierarchy', () => {
  it('renders "My disputes" as a real h2 (no H1 -> H3 skip)', async () => {
    mockAppointments([appointment()]);
    mockDisputes([]);
    renderWorkspace();

    const heading = await screen.findByRole('heading', { level: 2, name: 'My disputes' });
    expect(heading).toBeInTheDocument();
  });
});

describe('DisputesWorkspace expired-appointment exclusion', () => {
  it('never offers an Expired appointment in the picker', async () => {
    mockAppointments([appointment({ id: 'expired-1', status: 'expired' }), appointment({ id: 'active-1' })]);
    mockDisputes([]);
    const user = userEvent.setup({ delay: null });
    renderWorkspace();

    await user.click(await screen.findByRole('button', { name: 'Raise a dispute' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('combobox', { name: 'Appointment' }));
    const options = await screen.findAllByRole('option');
    expect(options).toHaveLength(1);
  });
});

describe('DisputesWorkspace empty state', () => {
  it('shows the empty-state CTA and hides the above-card trigger', async () => {
    mockAppointments([appointment()]);
    mockDisputes([]);
    renderWorkspace();

    await screen.findByText('No disputes raised');
    // Only one "Raise a dispute" trigger exists at a time -- the empty
    // state's own button, not a duplicate above-card one.
    expect(screen.getAllByRole('button', { name: 'Raise a dispute' })).toHaveLength(1);
  });

  it('shows the above-card trigger once disputes exist, not the empty-state one', async () => {
    mockAppointments([appointment({ id: 'appointment-2' })]);
    mockDisputes([dispute()]);
    renderWorkspace();

    await screen.findByText(/waited for twenty minutes/);
    expect(screen.getAllByRole('button', { name: 'Raise a dispute' })).toHaveLength(1);
    expect(screen.queryByText('No disputes raised')).not.toBeInTheDocument();
  });
});

describe('DisputesWorkspace raise-dispute form', () => {
  it('requires a category before the submit button enables', async () => {
    mockAppointments([appointment()]);
    mockDisputes([]);
    const user = userEvent.setup({ delay: null });
    renderWorkspace();

    await openRaiseDialog(user);
    await user.type(screen.getByLabelText('What happened?'), VALID_REASON);
    await user.click(screen.getByLabelText('I confirm this report is accurate and understand it will be reviewed by an admin.'));

    expect(screen.getByRole('button', { name: 'Raise dispute' })).toBeDisabled();

    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    await user.click(await screen.findByRole('option', { name: 'No-show' }));

    expect(screen.getByRole('button', { name: 'Raise dispute' })).toBeEnabled();
  }, 15000);

  it('enforces a 30-character minimum reason and shows a live counter', async () => {
    mockAppointments([appointment()]);
    mockDisputes([]);
    const user = userEvent.setup({ delay: null });
    renderWorkspace();

    await openRaiseDialog(user);
    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    await user.click(await screen.findByRole('option', { name: 'No-show' }));
    await user.click(screen.getByLabelText('I confirm this report is accurate and understand it will be reviewed by an admin.'));

    await user.type(screen.getByLabelText('What happened?'), 'Too short');
    expect(screen.getByText('9/1000')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Raise dispute' })).toBeDisabled();

    await user.type(screen.getByLabelText('What happened?'), ' - now this reason is long enough to submit.');
    expect(screen.getByRole('button', { name: 'Raise dispute' })).toBeEnabled();
  }, 15000);

  it('gates submit on the acknowledgment checkbox', async () => {
    mockAppointments([appointment()]);
    mockDisputes([]);
    const user = userEvent.setup({ delay: null });
    renderWorkspace();

    await openRaiseDialog(user);
    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    await user.click(await screen.findByRole('option', { name: 'No-show' }));
    await user.type(screen.getByLabelText('What happened?'), VALID_REASON);

    expect(screen.getByRole('button', { name: 'Raise dispute' })).toBeDisabled();
    await user.click(screen.getByLabelText('I confirm this report is accurate and understand it will be reviewed by an admin.'));
    expect(screen.getByRole('button', { name: 'Raise dispute' })).toBeEnabled();
  }, 15000);

  it('submits via the submit button and sends category/attachment fields', async () => {
    mockAppointments([appointment()]);
    mockDisputes([]);
    let sentBody: unknown;
    server.use(
      http.post(`${base()}/disputes`, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json({ data: dispute() }, { status: 201 });
      }),
    );

    const user = userEvent.setup({ delay: null });
    renderWorkspace();

    await openRaiseDialog(user);
    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    await user.click(await screen.findByRole('option', { name: 'No-show' }));
    await user.type(screen.getByLabelText('What happened?'), VALID_REASON);
    await user.click(screen.getByLabelText('I confirm this report is accurate and understand it will be reviewed by an admin.'));

    await user.click(screen.getByRole('button', { name: 'Raise dispute' }));

    await waitFor(() =>
      expect(sentBody).toMatchObject({ appointmentId: 'appointment-1', reason: VALID_REASON, category: 'no_show' }),
    );
  }, 15000);

  it('submits on a raw form submit event (Enter-equivalent, no click)', async () => {
    mockAppointments([appointment()]);
    mockDisputes([]);
    let called = false;
    server.use(
      http.post(`${base()}/disputes`, async () => {
        called = true;
        return HttpResponse.json({ data: dispute() }, { status: 201 });
      }),
    );

    const user = userEvent.setup({ delay: null });
    renderWorkspace();

    await openRaiseDialog(user);
    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    await user.click(await screen.findByRole('option', { name: 'No-show' }));
    const textarea = screen.getByLabelText('What happened?');
    await user.type(textarea, VALID_REASON);
    await user.click(screen.getByLabelText('I confirm this report is accurate and understand it will be reviewed by an admin.'));

    const form = textarea.closest('form');
    expect(form).not.toBeNull();
    (form as HTMLFormElement).requestSubmit();

    await waitFor(() => expect(called).toBe(true));
  }, 15000);

  it('rejects a disallowed attachment type without starting the upload', async () => {
    mockAppointments([appointment()]);
    mockDisputes([]);
    const user = userEvent.setup({ delay: null });
    renderWorkspace();

    await openRaiseDialog(user);
    const badType = new File(['x'], 'notes.txt', { type: 'text/plain' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    // `userEvent.upload` respects the input's own `accept` filter and would
    // silently refuse to attach a non-matching file -- `fireEvent.change`
    // (matching `message-composer.test.tsx`'s own identical precedent for
    // this same rejection path) drives the raw DOM event instead.
    fireEvent.change(input, { target: { files: [badType] } });

    expect(await screen.findByText("That file type isn't supported. Attach a PDF or image (JPG/PNG).")).toBeInTheDocument();
    expect(screen.queryByText('notes.txt')).not.toBeInTheDocument();
  });

  it('uploads a valid attachment and shows the filename chip', async () => {
    mockAppointments([appointment()]);
    mockDisputes([]);
    const user = userEvent.setup({ delay: null });
    renderWorkspace();

    await openRaiseDialog(user);
    const validFile = new File(['x'], 'evidence.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [validFile] } });

    expect(await screen.findByText('evidence.pdf')).toBeInTheDocument();
  });
});

describe('DisputesWorkspace list filters and withdraw', () => {
  it('filters the list by status client-side', async () => {
    mockAppointments([appointment({ id: 'appointment-2' })]);
    mockDisputes([
      dispute({ id: 'dispute-open', status: 'open' }),
      dispute({ id: 'dispute-resolved', appointmentId: 'appointment-2', status: 'resolved', reason: 'A billing issue was resolved after review.' }),
    ]);
    const user = userEvent.setup({ delay: null });
    renderWorkspace();

    await screen.findByText(/waited for twenty minutes/);
    expect(screen.getByText(/billing issue/)).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: 'Filter by status' }));
    await user.click(await screen.findByRole('option', { name: 'Resolved' }));

    expect(screen.queryByText(/waited for twenty minutes/)).not.toBeInTheDocument();
    expect(screen.getByText(/billing issue/)).toBeInTheDocument();
  });

  it('shows Withdraw only to the raiser on an open dispute, not the counterparty', async () => {
    mockAppointments([]);
    mockDisputes([dispute({ status: 'open', raisedByAccountId: RAISER_ACCOUNT_ID })]);
    renderWorkspace(patientAuthState);

    expect(await screen.findByRole('button', { name: 'Withdraw' })).toBeInTheDocument();
  });

  it('hides Withdraw from the counterparty on a dispute they did not raise', async () => {
    mockAppointments([]);
    mockDisputes([dispute({ status: 'open', raisedByAccountId: RAISER_ACCOUNT_ID })]);
    const counterpartyAuthState: AuthState = {
      status: 'authenticated',
      user: { id: COUNTERPARTY_ACCOUNT_ID, email: 'doctor@orivex.dev', fullName: 'Dr. Sarah Ahmed', roles: ['doctor'] },
    };
    renderWorkspace(counterpartyAuthState);

    await screen.findByText(/waited for twenty minutes/);
    expect(screen.queryByRole('button', { name: 'Withdraw' })).not.toBeInTheDocument();
  });

  it('never shows Withdraw on a resolved dispute, even for the raiser', async () => {
    mockAppointments([]);
    mockDisputes([dispute({ status: 'resolved', raisedByAccountId: RAISER_ACCOUNT_ID })]);
    renderWorkspace(patientAuthState);

    await screen.findByText(/waited for twenty minutes/);
    expect(screen.queryByRole('button', { name: 'Withdraw' })).not.toBeInTheDocument();
  });

  it('withdraws an open dispute after confirming', async () => {
    mockAppointments([]);
    mockDisputes([dispute({ status: 'open', raisedByAccountId: RAISER_ACCOUNT_ID })]);
    let withdrawCalled = false;
    server.use(
      http.patch(`${base()}/disputes/:id/withdraw`, () => {
        withdrawCalled = true;
        return HttpResponse.json({ data: dispute({ status: 'withdrawn' }) });
      }),
    );

    const user = userEvent.setup({ delay: null });
    renderWorkspace();

    await user.click(await screen.findByRole('button', { name: 'Withdraw' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Withdraw dispute' }));

    await waitFor(() => expect(withdrawCalled).toBe(true));
  });
});
