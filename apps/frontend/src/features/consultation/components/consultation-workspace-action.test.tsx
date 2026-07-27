import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';

import { ConsultationWorkspaceAction } from './consultation-workspace-action';

const SESSION_ID = 'session-1';

function emptySummary() {
  return {
    session: {
      id: SESSION_ID,
      appointmentId: 'appointment-1',
      state: 'in_progress',
      completionReason: null,
      startedAt: '2026-07-26T10:00:00.000Z',
      closedAt: null,
    },
    appointment: {
      id: 'appointment-1',
      patientId: 'patient-profile-1',
      doctorId: 'doctor-profile-1',
      availabilityWindowId: 'window-1',
      consultationType: 'paid',
      status: 'confirmed',
      scheduledAt: '2026-07-26T10:00:00.000Z',
      reasonForVisit: null,
      rescheduledFromId: null,
    },
    clinicalNotes: [],
    prescriptions: [],
    diagnoses: [],
    followUpRecommendation: null,
    feedback: null,
  };
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('ConsultationWorkspaceAction', () => {
  it('only fetches the summary after the dialog is opened, not on mount', async () => {
    let requestCount = 0;
    server.use(
      http.get(`${env.apiBaseUrl}/consultations/:id/summary`, () => {
        requestCount += 1;
        return HttpResponse.json({ data: emptySummary() });
      }),
    );

    renderWithProviders(<ConsultationWorkspaceAction consultationSessionId={SESSION_ID} />);
    expect(requestCount).toBe(0);

    await userEvent.click(screen.getByRole('button', { name: 'Consultation workspace' }));

    await waitFor(() => expect(requestCount).toBe(1));
    expect(await screen.findByRole('button', { name: 'Complete Consultation' })).toBeInTheDocument();
  });

  it('warns before completing when there is unsaved note/diagnosis/follow-up input, and skips the warning when there is none', async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/consultations/:id/summary`, () => HttpResponse.json({ data: emptySummary() })),
    );
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    let closeCallCount = 0;
    server.use(
      http.post(`${env.apiBaseUrl}/consultations/:id/close`, () => {
        closeCallCount += 1;
        return HttpResponse.json({ data: { ...emptySummary().session, state: 'completed', completionReason: 'completed' } });
      }),
    );

    renderWithProviders(<ConsultationWorkspaceAction consultationSessionId={SESSION_ID} />);
    await userEvent.click(screen.getByRole('button', { name: 'Consultation workspace' }));
    await screen.findByRole('button', { name: 'Complete Consultation' });

    await userEvent.type(screen.getByPlaceholderText('Add a clinical note...'), 'Patient reports improvement');
    await userEvent.click(screen.getByRole('button', { name: 'Complete Consultation' }));

    expect(confirmSpy).toHaveBeenCalledWith('You have unsaved input. Complete the consultation anyway?');
    await waitFor(() => expect(closeCallCount).toBe(1));

    confirmSpy.mockRestore();
  });
});
