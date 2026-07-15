import { http, HttpResponse } from 'msw';
import { env } from '@/shared/lib/env';
import { PATIENT_PATHS } from '@/features/patient/api/paths';
import { getActivePrescriptions, getDashboardSummary, getUpcomingAppointments } from '@/mocks/patient-store';

const base = () => env.apiBaseUrl;

export const patientHandlers = [
  http.get(`${base()}${PATIENT_PATHS.dashboardSummary}`, () => HttpResponse.json({ data: getDashboardSummary() })),

  http.get(`${base()}${PATIENT_PATHS.upcomingAppointments}`, () =>
    HttpResponse.json({ data: getUpcomingAppointments() }),
  ),

  http.get(`${base()}${PATIENT_PATHS.activePrescriptions}`, () =>
    HttpResponse.json({ data: getActivePrescriptions() }),
  ),
];
