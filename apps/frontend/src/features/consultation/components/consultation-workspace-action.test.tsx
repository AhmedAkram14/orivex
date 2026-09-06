import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';
import type { ConsultationSummary } from '@/features/consultation/api/types';

import { ConsultationWorkspaceAction } from './consultation-workspace-action';

const SESSION_ID = 'session-1';

function emptySummary(): ConsultationSummary {
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
    journeys: [],
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

  // Doctor prescription authoring (ORIVEX Remaining Work Audit, P0 C4): a
  // prescription requires a real diagnosisNodeId, so the form is gated
  // behind having recorded at least one diagnosis this session -- never a
  // fabricated one.
  describe('Prescriptions tab', () => {
    function summaryWithOneDiagnosis(): ConsultationSummary {
      return {
        ...emptySummary(),
        diagnoses: [
          { id: 'diagnosis-1', nodeType: 'condition', description: 'Seasonal allergic rhinitis', certaintyLevel: 'confirmed', createdAt: '2026-08-20T14:00:00.000Z' },
        ],
      };
    }

    async function openPrescriptionsTab(summary: ReturnType<typeof emptySummary> = emptySummary()) {
      server.use(http.get(`${env.apiBaseUrl}/consultations/:id/summary`, () => HttpResponse.json({ data: summary })));
      renderWithProviders(<ConsultationWorkspaceAction consultationSessionId={SESSION_ID} />);
      await userEvent.click(screen.getByRole('button', { name: 'Consultation workspace' }));
      await screen.findByRole('button', { name: 'Complete Consultation' });
      await userEvent.click(screen.getByRole('tab', { name: 'Prescriptions' }));
    }

    it('shows a gate message instead of the form when no diagnosis has been recorded yet', async () => {
      await openPrescriptionsTab();

      expect(screen.getByText('Record a diagnosis first to prescribe against it.')).toBeInTheDocument();
      expect(screen.queryByLabelText('Medication')).not.toBeInTheDocument();
    });

    it('renders the prescription form once a diagnosis exists, with Sign disabled until required fields are filled', async () => {
      await openPrescriptionsTab(summaryWithOneDiagnosis());

      expect(screen.getByRole('combobox', { name: 'Diagnosis' })).toBeInTheDocument();
      expect(screen.getByLabelText('Medication')).toBeInTheDocument();
      expect(screen.getByLabelText('Dosage')).toBeInTheDocument();
      expect(screen.getByLabelText('Frequency')).toBeInTheDocument();
      expect(screen.getByLabelText('Duration (days)')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign prescription' })).toBeDisabled();
    });

    it('signs a prescription with a real client-minted drugCatalogId and the doctor-entered fields, never a fabricated catalog reference', async () => {
      let requestBody: { consultationSessionId: string; diagnosisNodeId: string; lineItems: unknown[] } | undefined;
      server.use(
        http.post(`${env.apiBaseUrl}/prescriptions`, async ({ request }) => {
          requestBody = (await request.json()) as { consultationSessionId: string; diagnosisNodeId: string; lineItems: unknown[] };
          return HttpResponse.json(
            {
              data: {
                id: 'prescription-1',
                consultationSessionId: SESSION_ID,
                diagnosisNodeId: 'diagnosis-1',
                status: 'signed',
                lineItems: requestBody.lineItems,
                signedAt: new Date().toISOString(),
              },
            },
            { status: 201 },
          );
        }),
      );
      await openPrescriptionsTab(summaryWithOneDiagnosis());

      await userEvent.click(screen.getByRole('combobox', { name: 'Diagnosis' }));
      await userEvent.click(await screen.findByRole('option', { name: 'Seasonal allergic rhinitis' }));
      await userEvent.type(screen.getByLabelText('Medication'), 'Amoxicillin 500mg');
      await userEvent.type(screen.getByLabelText('Dosage'), '500mg');
      await userEvent.type(screen.getByLabelText('Frequency'), 'Twice daily');
      await userEvent.type(screen.getByLabelText('Duration (days)'), '7');
      await userEvent.click(screen.getByRole('button', { name: 'Sign prescription' }));

      await waitFor(() => expect(requestBody).toBeDefined());
      expect(requestBody?.consultationSessionId).toBe(SESSION_ID);
      expect(requestBody?.diagnosisNodeId).toBe('diagnosis-1');
      expect(requestBody?.lineItems).toEqual([
        {
          drugCatalogId: expect.stringMatching(/^[0-9a-f-]{36}$/i),
          drugName: 'Amoxicillin 500mg',
          dosage: '500mg',
          frequency: 'Twice daily',
          durationDays: 7,
          instructions: undefined,
        },
      ]);
      expect(await screen.findByText('Prescription signed.')).toBeInTheDocument();
      expect(screen.getByLabelText('Medication')).toHaveValue('');
    });

    it('shows an actionable error and keeps the entered values when signing fails', async () => {
      server.use(
        http.post(`${env.apiBaseUrl}/prescriptions`, () =>
          HttpResponse.json(
            { error: { code: 'FORBIDDEN', message: 'Not the treating doctor', requestId: 'mock', timestamp: new Date().toISOString() } },
            { status: 403 },
          ),
        ),
      );
      await openPrescriptionsTab(summaryWithOneDiagnosis());

      await userEvent.click(screen.getByRole('combobox', { name: 'Diagnosis' }));
      await userEvent.click(await screen.findByRole('option', { name: 'Seasonal allergic rhinitis' }));
      await userEvent.type(screen.getByLabelText('Medication'), 'Amoxicillin 500mg');
      await userEvent.type(screen.getByLabelText('Dosage'), '500mg');
      await userEvent.type(screen.getByLabelText('Frequency'), 'Twice daily');
      await userEvent.type(screen.getByLabelText('Duration (days)'), '7');
      await userEvent.click(screen.getByRole('button', { name: 'Sign prescription' }));

      expect(await screen.findByText("Couldn't save. Please try again.")).toBeInTheDocument();
      expect(screen.getByLabelText('Medication')).toHaveValue('Amoxicillin 500mg');
    });

    it('lists prescriptions already signed this session, fetched from the real summary', async () => {
      await openPrescriptionsTab({
        ...summaryWithOneDiagnosis(),
        prescriptions: [
          {
            id: 'prescription-seed-1',
            consultationSessionId: SESSION_ID,
            diagnosisNodeId: 'diagnosis-1',
            status: 'signed',
            lineItems: [
              { drugCatalogId: 'cat-1', drugName: 'Amoxicillin 500mg', dosage: '500mg', frequency: 'Twice daily', durationDays: 7, instructions: null },
            ],
            signedAt: '2026-08-20T14:10:00.000Z',
          },
        ],
      });

      expect(screen.getByText(/Amoxicillin 500mg/)).toBeInTheDocument();
      expect(screen.queryByText('No prescriptions for this consultation.')).not.toBeInTheDocument();
    });
  });

  // Health Journey stage-advance fix (ORIVEX Remaining Work Audit, P0 C5).
  describe('Diagnosis tab -- start a Health Journey', () => {
    it('sends startJourney: true only when the checkbox is checked', async () => {
      let requestBody: { startJourney?: boolean } | undefined;
      server.use(
        http.get(`${env.apiBaseUrl}/consultations/:id/summary`, () => HttpResponse.json({ data: emptySummary() })),
        http.post(`${env.apiBaseUrl}/consultations/:id/diagnosis`, async ({ request }) => {
          requestBody = (await request.json()) as { startJourney?: boolean };
          return HttpResponse.json(
            {
              data: {
                node: { id: 'diagnosis-1', nodeType: 'condition', description: 'Seasonal allergic rhinitis', certaintyLevel: 'suspected', createdAt: new Date().toISOString() },
              },
            },
            { status: 201 },
          );
        }),
      );
      renderWithProviders(<ConsultationWorkspaceAction consultationSessionId={SESSION_ID} />);
      await userEvent.click(screen.getByRole('button', { name: 'Consultation workspace' }));
      await screen.findByRole('button', { name: 'Complete Consultation' });
      await userEvent.click(screen.getByRole('tab', { name: 'Diagnosis' }));

      await userEvent.type(screen.getByPlaceholderText('Describe the diagnosis...'), 'Seasonal allergic rhinitis');
      await userEvent.click(screen.getByRole('checkbox', { name: 'Start a Health Journey to track this condition over time' }));
      await userEvent.click(screen.getByRole('button', { name: 'Save diagnosis' }));

      await waitFor(() => expect(requestBody?.startJourney).toBe(true));
    });
  });

  describe('Journey tab', () => {
    function summaryWithOneJourney(): ConsultationSummary {
      return {
        ...emptySummary(),
        journeys: [
          {
            id: 'journey-1',
            rootNode: { id: 'diagnosis-1', nodeType: 'condition', description: 'Hypertension', certaintyLevel: 'confirmed', createdAt: '2026-08-20T14:00:00.000Z' },
            stage: 'diagnosis',
            linkedNodeIds: [],
            lastUpdatedAt: '2026-08-20T14:00:00.000Z',
          },
        ],
      };
    }

    async function openJourneyTab(summary: ConsultationSummary = emptySummary()) {
      server.use(http.get(`${env.apiBaseUrl}/consultations/:id/summary`, () => HttpResponse.json({ data: summary })));
      renderWithProviders(<ConsultationWorkspaceAction consultationSessionId={SESSION_ID} />);
      await userEvent.click(screen.getByRole('button', { name: 'Consultation workspace' }));
      await screen.findByRole('button', { name: 'Complete Consultation' });
      await userEvent.click(screen.getByRole('tab', { name: 'Journey' }));
    }

    it('shows an honest empty state when the patient has no Health Journeys yet', async () => {
      await openJourneyTab();

      expect(screen.getByText('No Health Journeys for this patient yet.')).toBeInTheDocument();
    });

    it("lists a journey with its current stage and only the real backend's own allowed next stages", async () => {
      await openJourneyTab(summaryWithOneJourney());

      expect(screen.getByText('Hypertension')).toBeInTheDocument();
      // "Diagnosis" also names the Diagnosis tab trigger -- scope to the
      // journey's own stage badge to disambiguate.
      expect(screen.getByText('Diagnosis', { selector: 'span' })).toBeInTheDocument();
      await userEvent.click(screen.getByRole('combobox', { name: 'Select next stage' }));
      expect(await screen.findByRole('option', { name: 'Follow-up' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Referred out' })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: 'Resolved' })).not.toBeInTheDocument();
    });

    it('advances the journey stage and shows the real backend-updated stage', async () => {
      let requestBody: { stage?: string } | undefined;
      server.use(
        http.patch(`${env.apiBaseUrl}/journeys/:id`, async ({ request, params }) => {
          requestBody = (await request.json()) as { stage?: string };
          return HttpResponse.json({
            data: { id: params.id, rootNode: summaryWithOneJourney().journeys[0].rootNode, stage: requestBody?.stage, linkedNodeIds: [], lastUpdatedAt: new Date().toISOString() },
          });
        }),
      );
      await openJourneyTab(summaryWithOneJourney());

      await userEvent.click(screen.getByRole('combobox', { name: 'Select next stage' }));
      await userEvent.click(await screen.findByRole('option', { name: 'Follow-up' }));
      await userEvent.click(screen.getByRole('button', { name: 'Advance stage' }));

      await waitFor(() => expect(requestBody?.stage).toBe('follow_up'));
      expect(await screen.findByText('Journey stage updated.')).toBeInTheDocument();
    });

    it('shows a terminal message and no stage selector once a journey has reached a terminal stage', async () => {
      await openJourneyTab({
        ...summaryWithOneJourney(),
        journeys: [{ ...summaryWithOneJourney().journeys[0], stage: 'resolved' }],
      });

      expect(screen.getByText('This journey has reached its final stage.')).toBeInTheDocument();
      expect(screen.queryByRole('combobox', { name: 'Select next stage' })).not.toBeInTheDocument();
    });
  });
});
