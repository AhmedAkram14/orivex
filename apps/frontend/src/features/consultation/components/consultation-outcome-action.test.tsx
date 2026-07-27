import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';

import { ConsultationOutcomeAction } from './consultation-outcome-action';

const SESSION_ID = 'session-1';

function completedSummary(overrides?: { feedback?: unknown }) {
  return {
    session: {
      id: SESSION_ID,
      appointmentId: 'appointment-1',
      state: 'completed',
      completionReason: 'completed',
      startedAt: '2026-07-26T10:00:00.000Z',
      closedAt: '2026-07-26T10:20:00.000Z',
    },
    appointment: {
      id: 'appointment-1',
      patientId: 'patient-profile-1',
      doctorId: 'doctor-profile-1',
      availabilityWindowId: 'window-1',
      consultationType: 'paid',
      status: 'completed',
      scheduledAt: '2026-07-26T10:00:00.000Z',
      reasonForVisit: null,
      rescheduledFromId: null,
    },
    clinicalNotes: [],
    prescriptions: [],
    diagnoses: [],
    followUpRecommendation: null,
    feedback: overrides?.feedback ?? null,
  };
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('ConsultationOutcomeAction', () => {
  it('shows the doctor, visit duration, and the rating form when not yet rated', async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/consultations/:id/summary`, () => HttpResponse.json({ data: completedSummary() })),
    );

    renderWithProviders(<ConsultationOutcomeAction consultationSessionId={SESSION_ID} />);
    await userEvent.click(screen.getByRole('button', { name: 'View summary' }));

    expect(await screen.findByText('Dr. Sarah Ahmed')).toBeInTheDocument();
    expect(screen.getByText('20 min')).toBeInTheDocument();
    expect(screen.getByText('Rate your consultation')).toBeInTheDocument();
  });

  it('shows the already-submitted rating instead of the form once feedback exists', async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/consultations/:id/summary`, () =>
        HttpResponse.json({
          data: completedSummary({
            feedback: {
              id: 'feedback-1',
              consultationSessionId: SESSION_ID,
              doctorId: 'doctor-profile-1',
              rating: 5,
              comment: null,
              createdAt: '2026-07-26T10:25:00.000Z',
            },
          }),
        }),
      ),
    );

    renderWithProviders(<ConsultationOutcomeAction consultationSessionId={SESSION_ID} />);
    await userEvent.click(screen.getByRole('button', { name: 'View summary' }));

    await waitFor(() => expect(screen.getByText('You rated this consultation 5 of 5.')).toBeInTheDocument());
    expect(screen.queryByText('Rate your consultation')).not.toBeInTheDocument();
  });
});
