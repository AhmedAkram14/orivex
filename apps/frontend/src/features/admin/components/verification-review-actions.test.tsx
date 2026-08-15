import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { VerificationReviewActions } from './verification-review-actions';
import { decideVerificationCase, resetVerificationCaseStore, submitVerificationCase } from '@/mocks/verification-case-store';
import { server } from '@/mocks/server';
import enMessages from '../../../../messages/en.json';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetVerificationCaseStore();
});
afterAll(() => server.close());

function renderActions(verificationCase: ReturnType<typeof submitVerificationCase>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <VerificationReviewActions verificationCase={verificationCase} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

function seedSubmittedCase() {
  return submitVerificationCase({
    subjectAccountId: 'account-doctor-1',
    subjectType: 'doctor',
    licenseNumber: 'LIC-1',
    documentAssetIds: ['asset-1'],
  });
}

describe('VerificationReviewActions', () => {
  it('requires confirmation before approving, unlike relying on the immediate click alone', async () => {
    const verificationCase = seedSubmittedCase();
    renderActions(verificationCase);

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(await screen.findByText('Approve this verification?')).toBeInTheDocument();
  });

  it('does not fire the approve mutation until the confirm dialog is confirmed', async () => {
    const verificationCase = seedSubmittedCase();
    renderActions(verificationCase);

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await screen.findByText('Approve this verification?');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Approve this verification?')).not.toBeInTheDocument();
    expect(screen.queryByText('Verification approved.')).not.toBeInTheDocument();
  });

  it('approves through the confirm dialog and shows success feedback', async () => {
    const verificationCase = seedSubmittedCase();
    renderActions(verificationCase);

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await screen.findByText('Approve this verification?');

    const confirmButtons = screen.getAllByRole('button', { name: 'Approve' });
    await userEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(screen.getByText('Verification approved.')).toBeInTheDocument());
    expect(screen.queryByText('Approve this verification?')).not.toBeInTheDocument();
  });

  it('rejects through the reason dialog and shows success feedback', async () => {
    const verificationCase = seedSubmittedCase();
    renderActions(verificationCase);

    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
    await screen.findByText('Reject this application?');
    await userEvent.type(screen.getByLabelText('Reason'), 'Missing documents');

    const confirmButtons = screen.getAllByRole('button', { name: 'Reject' });
    await userEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(screen.getByText('Verification rejected.')).toBeInTheDocument());
  });

  it('requests more information through the reason dialog and shows success feedback', async () => {
    const verificationCase = seedSubmittedCase();
    renderActions(verificationCase);

    await userEvent.click(screen.getByRole('button', { name: 'Request more information' }));
    await screen.findByText('The applicant will see this message and can correct and resubmit.');
    await userEvent.type(screen.getByLabelText('Reason'), 'Please resubmit your license.');

    const confirmButtons = screen.getAllByRole('button', { name: 'Request more information' });
    await userEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(screen.getByText('More information requested.')).toBeInTheDocument());
  });

  it('suspends an approved case through the reason dialog and shows success feedback', async () => {
    const submitted = seedSubmittedCase();
    const approved = decideVerificationCase(submitted.id, 'approved');
    if (!approved) throw new Error('expected the seeded case to be decidable');
    renderActions(approved);

    await userEvent.click(screen.getByRole('button', { name: 'Suspend' }));
    await screen.findByText('Suspend this verification?');
    await userEvent.type(screen.getByLabelText('Reason'), 'Complaint under investigation');

    const confirmButtons = screen.getAllByRole('button', { name: 'Suspend' });
    await userEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(screen.getByText('Verification suspended.')).toBeInTheDocument());
  });
});
