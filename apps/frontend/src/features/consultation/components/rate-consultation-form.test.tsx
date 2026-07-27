import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';

import { RateConsultationForm } from './rate-consultation-form';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('RateConsultationForm', () => {
  it('keeps the submit button disabled until a star rating is picked', async () => {
    renderWithProviders(
      <RateConsultationForm consultationSessionId="session-1" doctorProfileId="doctor-profile-1" />,
    );

    expect(screen.getByRole('button', { name: 'Submit rating' })).toBeDisabled();

    await userEvent.click(screen.getByRole('radio', { name: '4 of 5 stars' }));

    expect(screen.getByRole('button', { name: 'Submit rating' })).toBeEnabled();
  });

  it('submits the picked rating and optional comment, deriving ownership server-side', async () => {
    const onSubmitted = vi.fn();
    let submittedBody: unknown;
    server.use(
      http.post(`${env.apiBaseUrl}/consultations/:id/feedback`, async ({ request }) => {
        submittedBody = await request.json();
        return HttpResponse.json(
          {
            data: {
              id: 'feedback-1',
              consultationSessionId: 'session-1',
              doctorId: 'doctor-profile-1',
              rating: 5,
              comment: 'Great visit',
              createdAt: '2026-07-26T00:00:00.000Z',
            },
          },
          { status: 201 },
        );
      }),
    );

    renderWithProviders(
      <RateConsultationForm
        consultationSessionId="session-1"
        doctorProfileId="doctor-profile-1"
        onSubmitted={onSubmitted}
      />,
    );

    await userEvent.click(screen.getByRole('radio', { name: '5 of 5 stars' }));
    await userEvent.type(screen.getByPlaceholderText('Leave an optional comment...'), 'Great visit');
    await userEvent.click(screen.getByRole('button', { name: 'Submit rating' }));

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledTimes(1));
    expect(submittedBody).toEqual({ rating: 5, comment: 'Great visit' });
  });
});
