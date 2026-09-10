import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';

import { FlagReviewAction } from './flag-review-action';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('FlagReviewAction', () => {
  it('sends the reason typed into the dialog, disabled until something is entered', async () => {
    let sentBody: unknown;
    server.use(
      http.patch(`${env.apiBaseUrl}/reviews/:id/flag`, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json({
          data: {
            id: 'feedback-1',
            consultationSessionId: 'session-1',
            doctorId: 'doctor-profile-1',
            rating: 5,
            comment: 'hello',
            createdAt: new Date().toISOString(),
            patientProfileId: 'patient-profile-1',
            patientName: 'Amina Youssef',
            moderationStatus: 'flagged',
            moderationReason: 'Contains a name.',
            moderatedByAccountId: null,
            moderatedAt: null,
          },
        });
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<FlagReviewAction feedbackId="feedback-1" doctorProfileId="doctor-profile-1" />);

    await user.click(screen.getByRole('button', { name: 'Flag' }));
    expect(screen.getByRole('button', { name: 'Flag review' })).toBeDisabled();

    await user.type(screen.getByPlaceholderText("e.g. contains another patient's name"), 'Contains a name.');
    expect(screen.getByRole('button', { name: 'Flag review' })).not.toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Flag review' }));

    await waitFor(() => expect(sentBody).toEqual({ reason: 'Contains a name.' }));
  });

  it('shows an error and keeps the dialog open when flagging fails', async () => {
    server.use(
      http.patch(`${env.apiBaseUrl}/reviews/:id/flag`, () =>
        HttpResponse.json(
          { error: { code: 'VALIDATION_FAILED', message: 'boom', requestId: 'r', timestamp: new Date().toISOString() } },
          { status: 422 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderWithProviders(<FlagReviewAction feedbackId="feedback-1" doctorProfileId="doctor-profile-1" />);

    await user.click(screen.getByRole('button', { name: 'Flag' }));
    await user.type(screen.getByPlaceholderText("e.g. contains another patient's name"), 'Reason.');
    await user.click(screen.getByRole('button', { name: 'Flag review' }));

    expect(await screen.findByText("Couldn't flag this review. Please try again.")).toBeInTheDocument();
  });
});
