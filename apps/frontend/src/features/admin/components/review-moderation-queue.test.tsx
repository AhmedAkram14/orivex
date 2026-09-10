import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';

import { ReviewModerationQueue } from './review-moderation-queue';

const base = () => env.apiBaseUrl;

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function flaggedReview() {
  return {
    id: 'feedback-1',
    consultationSessionId: 'session-1',
    doctorId: 'doctor-profile-1',
    rating: 2,
    comment: 'Contains a patient name by accident.',
    createdAt: new Date().toISOString(),
    patientProfileId: 'patient-profile-1',
    patientName: 'Amina Youssef',
    moderationStatus: 'flagged',
    moderationReason: 'Contains a name.',
    moderatedByAccountId: null,
    moderatedAt: null,
  };
}

describe('ReviewModerationQueue', () => {
  it('shows the empty state when nothing is flagged', async () => {
    server.use(http.get(`${base()}/admin/reviews`, () => HttpResponse.json({ data: [] })));

    renderWithProviders(<ReviewModerationQueue />);

    expect(await screen.findByText('Nothing flagged')).toBeInTheDocument();
  });

  it('lists a flagged review with its flag reason, and hides it after a Hide decision', async () => {
    server.use(http.get(`${base()}/admin/reviews`, () => HttpResponse.json({ data: [flaggedReview()] })));

    let sentBody: unknown;
    server.use(
      http.patch(`${base()}/admin/reviews/:id/moderate`, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json({ data: { ...flaggedReview(), moderationStatus: 'hidden' } });
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<ReviewModerationQueue />);

    await screen.findByText('Contains a patient name by accident.');
    expect(screen.getByText(/Flagged because: Contains a name\./)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Hide' }));
    await user.type(screen.getByPlaceholderText('Explain your decision'), 'Confirmed identifying details.');
    await user.click(screen.getByRole('button', { name: 'Hide review' }));

    await waitFor(() =>
      expect(sentBody).toEqual({ status: 'hidden', reason: 'Confirmed identifying details.' }),
    );
  });

  it('shows a load error when the queue request fails', async () => {
    server.use(
      http.get(`${base()}/admin/reviews`, () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL', message: 'boom', requestId: 'r', timestamp: new Date().toISOString() } },
          { status: 500 },
        ),
      ),
    );

    renderWithProviders(<ReviewModerationQueue />);

    expect(await screen.findByText("Couldn't load the moderation queue.")).toBeInTheDocument();
  });
});
