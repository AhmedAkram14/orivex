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
    vitalReadings: [],
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

  describe('Vitals tab', () => {
    async function openVitalsTab() {
      server.use(
        http.get(`${env.apiBaseUrl}/consultations/:id/summary`, () => HttpResponse.json({ data: emptySummary() })),
      );
      renderWithProviders(<ConsultationWorkspaceAction consultationSessionId={SESSION_ID} />);
      await userEvent.click(screen.getByRole('button', { name: 'Consultation workspace' }));
      await screen.findByRole('button', { name: 'Complete Consultation' });
      await userEvent.click(screen.getByRole('tab', { name: 'Vitals' }));
    }

    it('renders the vitals form with Save disabled until something is entered', async () => {
      await openVitalsTab();

      expect(screen.getByText('No vitals recorded yet')).toBeInTheDocument();
      expect(screen.getByLabelText('Weight')).toBeInTheDocument();
      expect(screen.getByText('Blood pressure')).toBeInTheDocument();
      expect(screen.getByLabelText('Systolic')).toBeInTheDocument();
      expect(screen.getByLabelText('Diastolic')).toBeInTheDocument();
      expect(screen.getByLabelText('Blood sugar')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save vitals' })).toBeDisabled();
    });

    it('rejects a partial blood-pressure entry (systolic without diastolic)', async () => {
      await openVitalsTab();

      await userEvent.type(screen.getByPlaceholderText('Systolic'), '127');

      expect(screen.getByText('Enter both systolic and diastolic, or leave both blank.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save vitals' })).toBeDisabled();
    });

    it('supports partial vitals: weight alone saves with a single request, never fabricated values for the others', async () => {
      let requestBody: unknown;
      server.use(
        http.post(`${env.apiBaseUrl}/consultations/:id/vitals`, async ({ request }) => {
          requestBody = await request.json();
          return HttpResponse.json(
            { data: { id: 'vital-1', type: 'weight', recordedAt: new Date().toISOString(), valueLabel: '67.2 kg', value: 67.2 } },
            { status: 201 },
          );
        }),
      );
      await openVitalsTab();

      await userEvent.type(screen.getByLabelText('Weight'), '67.2');
      await userEvent.click(screen.getByRole('button', { name: 'Save vitals' }));

      await waitFor(() => expect(requestBody).toEqual({ type: 'weight', value: 67.2, diastolicValue: undefined }));
      expect(await screen.findByText('Vitals saved.')).toBeInTheDocument();
      expect(screen.getByLabelText('Weight')).toHaveValue(null);
    });

    it('sends one request per recorded type when weight, blood pressure, and blood sugar are all entered', async () => {
      const postedTypes: string[] = [];
      server.use(
        http.post(`${env.apiBaseUrl}/consultations/:id/vitals`, async ({ request }) => {
          const body = (await request.json()) as { type: string };
          postedTypes.push(body.type);
          return HttpResponse.json(
            { data: { id: `vital-${body.type}`, type: body.type, recordedAt: new Date().toISOString(), valueLabel: '', value: 0 } },
            { status: 201 },
          );
        }),
      );
      await openVitalsTab();

      await userEvent.type(screen.getByLabelText('Weight'), '67.2');
      await userEvent.type(screen.getByPlaceholderText('Systolic'), '127');
      await userEvent.type(screen.getByPlaceholderText('Diastolic'), '82');
      await userEvent.type(screen.getByLabelText('Blood sugar'), '110');
      await userEvent.click(screen.getByRole('button', { name: 'Save vitals' }));

      await waitFor(() => expect(postedTypes.sort()).toEqual(['blood-pressure', 'blood-sugar', 'weight']));
    });

    it('shows a loading state and prevents duplicate submission while saving', async () => {
      let resolveRequest: (() => void) | undefined;
      server.use(
        http.post(`${env.apiBaseUrl}/consultations/:id/vitals`, async () => {
          await new Promise<void>((resolve) => {
            resolveRequest = resolve;
          });
          return HttpResponse.json(
            { data: { id: 'vital-1', type: 'weight', recordedAt: new Date().toISOString(), valueLabel: '67.2 kg', value: 67.2 } },
            { status: 201 },
          );
        }),
      );
      await openVitalsTab();

      await userEvent.type(screen.getByLabelText('Weight'), '67.2');
      const saveButton = screen.getByRole('button', { name: 'Save vitals' });
      await userEvent.click(saveButton);

      await waitFor(() => expect(saveButton).toBeDisabled());
      resolveRequest?.();
    });

    it('shows an actionable error and keeps the entered values when the save fails', async () => {
      server.use(
        http.post(`${env.apiBaseUrl}/consultations/:id/vitals`, () =>
          HttpResponse.json(
            { error: { code: 'FORBIDDEN', message: 'Not the treating doctor', requestId: 'mock', timestamp: new Date().toISOString() } },
            { status: 403 },
          ),
        ),
      );
      await openVitalsTab();

      await userEvent.type(screen.getByLabelText('Weight'), '67.2');
      await userEvent.click(screen.getByRole('button', { name: 'Save vitals' }));

      expect(await screen.findByText("Couldn't save. Please try again.")).toBeInTheDocument();
      expect(screen.getByLabelText('Weight')).toHaveValue(67.2);
    });

    it('lists vitals already recorded this session, fetched from the real summary', async () => {
      server.use(
        http.get(`${env.apiBaseUrl}/consultations/:id/summary`, () =>
          HttpResponse.json({
            data: {
              ...emptySummary(),
              vitalReadings: [
                { id: 'v1', type: 'weight', recordedAt: '2026-08-20T14:05:00.000Z', valueLabel: '67.2 kg', value: 67.2 },
              ],
            },
          }),
        ),
      );
      renderWithProviders(<ConsultationWorkspaceAction consultationSessionId={SESSION_ID} />);
      await userEvent.click(screen.getByRole('button', { name: 'Consultation workspace' }));
      await screen.findByRole('button', { name: 'Complete Consultation' });
      await userEvent.click(screen.getByRole('tab', { name: 'Vitals' }));

      expect(screen.getByText('67.2 kg')).toBeInTheDocument();
      expect(screen.queryByText('No vitals recorded yet')).not.toBeInTheDocument();
    });
  });
});
