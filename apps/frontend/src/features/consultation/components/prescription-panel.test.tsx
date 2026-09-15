import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';
import type { ConsultationSummary } from '@/features/consultation/api/types';

import { PrescriptionPanel } from './prescription-panel';

const SESSION_ID = 'session-1';

function emptySummary(): ConsultationSummary {
  return {
    session: {
      id: SESSION_ID,
      appointmentId: 'appointment-1',
      state: 'completed',
      completionReason: 'completed',
      startedAt: '2026-07-26T10:00:00.000Z',
      closedAt: '2026-07-26T10:30:00.000Z',
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
    labRequests: [],
    diagnoses: [],
    vitalReadings: [],
    followUpRecommendation: null,
    feedback: null,
    journeys: [],
  };
}

function summaryWithOneDiagnosis(): ConsultationSummary {
  return {
    ...emptySummary(),
    diagnoses: [
      { id: 'diagnosis-1', nodeType: 'condition', description: 'Seasonal allergic rhinitis', certaintyLevel: 'confirmed', createdAt: '2026-08-20T14:00:00.000Z' },
    ],
  };
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('PrescriptionPanel', () => {
  it('fetches its own consultation summary (self-contained, no parent-provided data needed)', async () => {
    let requestCount = 0;
    server.use(
      http.get(`${env.apiBaseUrl}/consultations/:id/summary`, () => {
        requestCount += 1;
        return HttpResponse.json({ data: emptySummary() });
      }),
    );

    renderWithProviders(<PrescriptionPanel consultationSessionId={SESSION_ID} />);

    expect(await screen.findByText('Record a diagnosis first to prescribe against it.')).toBeInTheDocument();
    expect(requestCount).toBe(1);
  });

  it('shows a gate message instead of the form when no diagnosis has been recorded yet', async () => {
    server.use(http.get(`${env.apiBaseUrl}/consultations/:id/summary`, () => HttpResponse.json({ data: emptySummary() })));

    renderWithProviders(<PrescriptionPanel consultationSessionId={SESSION_ID} />);

    expect(await screen.findByText('Record a diagnosis first to prescribe against it.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Medication')).not.toBeInTheDocument();
  });

  it('renders the prescription form once a diagnosis exists, with Sign disabled until required fields are filled', async () => {
    server.use(http.get(`${env.apiBaseUrl}/consultations/:id/summary`, () => HttpResponse.json({ data: summaryWithOneDiagnosis() })));

    renderWithProviders(<PrescriptionPanel consultationSessionId={SESSION_ID} />);

    expect(await screen.findByLabelText('Medication')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign prescription' })).toBeDisabled();
  });

  it('signs a prescription against this session and reports dirty/clean state via onDirtyChange', async () => {
    let requestBody: { consultationSessionId: string; diagnosisNodeId: string; lineItems: unknown[] } | undefined;
    const dirtyStates: boolean[] = [];
    server.use(
      http.get(`${env.apiBaseUrl}/consultations/:id/summary`, () => HttpResponse.json({ data: summaryWithOneDiagnosis() })),
      http.post(`${env.apiBaseUrl}/prescriptions`, async ({ request }) => {
        requestBody = (await request.json()) as typeof requestBody;
        return HttpResponse.json(
          {
            data: {
              id: 'prescription-1',
              consultationSessionId: SESSION_ID,
              diagnosisNodeId: 'diagnosis-1',
              status: 'signed',
              lineItems: requestBody?.lineItems,
              signedAt: new Date().toISOString(),
            },
          },
          { status: 201 },
        );
      }),
    );

    renderWithProviders(<PrescriptionPanel consultationSessionId={SESSION_ID} onDirtyChange={(dirty) => dirtyStates.push(dirty)} />);

    await userEvent.click(await screen.findByRole('combobox', { name: 'Diagnosis' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Seasonal allergic rhinitis' }));
    await userEvent.type(screen.getByLabelText('Medication'), 'Amoxicillin 500mg');
    expect(dirtyStates).toContain(true);

    await userEvent.type(screen.getByLabelText('Dosage'), '500mg');
    await userEvent.type(screen.getByLabelText('Frequency'), 'Twice daily');
    await userEvent.type(screen.getByLabelText('Duration (days)'), '7');
    await userEvent.click(screen.getByRole('button', { name: 'Sign prescription' }));

    await waitFor(() => expect(requestBody).toBeDefined());
    expect(requestBody?.consultationSessionId).toBe(SESSION_ID);
    expect(requestBody?.diagnosisNodeId).toBe('diagnosis-1');
    expect(await screen.findByText('Prescription signed.')).toBeInTheDocument();
    await waitFor(() => expect(dirtyStates[dirtyStates.length - 1]).toBe(false));
  });
});
