import { http, HttpResponse } from 'msw';
import { env } from '@/shared/lib/env';
import { PATIENT_PATHS } from '@/features/patient/api/paths';
import type { PatientProfileUpdateRequest } from '@/features/patient/api/types';
import {
  getActivePrescriptions,
  getAppointments,
  getDashboardSummary,
  getMedicalRecords,
  getProfile,
  getUpcomingAppointments,
  updateProfile,
} from '@/mocks/patient-store';

const base = () => env.apiBaseUrl;

export const patientHandlers = [
  http.get(`${base()}${PATIENT_PATHS.dashboardSummary}`, () => HttpResponse.json({ data: getDashboardSummary() })),

  http.get(`${base()}${PATIENT_PATHS.upcomingAppointments}`, () =>
    HttpResponse.json({ data: getUpcomingAppointments() }),
  ),

  http.get(`${base()}${PATIENT_PATHS.activePrescriptions}`, () =>
    HttpResponse.json({ data: getActivePrescriptions() }),
  ),

  http.get(`${base()}${PATIENT_PATHS.profile}`, () => HttpResponse.json({ data: getProfile() })),

  http.patch(`${base()}${PATIENT_PATHS.profile}`, async ({ request }) => {
    const body = (await request.json()) as PatientProfileUpdateRequest;
    return HttpResponse.json({ data: updateProfile(body) });
  }),

  http.get(`${base()}${PATIENT_PATHS.appointments}`, () => HttpResponse.json({ data: getAppointments() })),

  http.get(`${base()}${PATIENT_PATHS.medicalRecords}`, () => HttpResponse.json({ data: getMedicalRecords() })),
];
