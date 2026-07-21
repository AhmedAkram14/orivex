import { http, HttpResponse } from 'msw';
import { env } from '@/shared/lib/env';
import { DOCTOR_PATHS } from '@/features/doctor/api/paths';
import type {
  DoctorProfileUpdateRequest,
  RegisterDoctorProfileRequest,
  SubmitVerificationRequest,
} from '@/features/doctor/api/types';
import {
  getDashboardSummary,
  getProfile,
  getQueue,
  getUpcomingWork,
  listVerifications,
  registerProfile,
  submitVerification,
  updateProfile,
} from '@/mocks/doctor-store';
import { listHospitals } from '@/mocks/admin-store';

const base = () => env.apiBaseUrl;

export const doctorHandlers = [
  // Every route below is a real endpoint (DoctorModule's DoctorProfileController,
  // TrustModule's DoctorVerificationController, AdministrationModule's public
  // hospital directory, ClinicalModule/ConsultationModule's dashboard-summary/
  // upcoming-work/queue routes) -- these handlers exist purely to keep the
  // frontend test suite deterministic, matching `patient.ts`/`scheduling.ts`.
  http.get(`${base()}${DOCTOR_PATHS.dashboardSummary}`, () => HttpResponse.json({ data: getDashboardSummary() })),

  http.get(`${base()}${DOCTOR_PATHS.upcomingWork}`, () => HttpResponse.json({ data: getUpcomingWork() })),

  http.get(`${base()}${DOCTOR_PATHS.profile}`, () => HttpResponse.json({ data: getProfile() })),

  http.patch(`${base()}${DOCTOR_PATHS.profile}`, async ({ request }) => {
    const body = (await request.json()) as DoctorProfileUpdateRequest;
    return HttpResponse.json({ data: updateProfile(body) });
  }),

  http.get(`${base()}${DOCTOR_PATHS.queue}`, () => HttpResponse.json({ data: getQueue() })),

  // Doctor Onboarding (Phase 4 continuation).
  http.post(`${base()}${DOCTOR_PATHS.register}`, async ({ request }) => {
    const body = (await request.json()) as RegisterDoctorProfileRequest;
    return HttpResponse.json({ data: registerProfile(body) }, { status: 201 });
  }),

  http.get(`${base()}/doctors/:id/verifications`, ({ params }) =>
    HttpResponse.json({ data: listVerifications(params.id as string) }),
  ),

  http.post(`${base()}/doctors/:id/verifications`, async ({ request, params }) => {
    const body = (await request.json()) as SubmitVerificationRequest;
    return HttpResponse.json({ data: submitVerification(params.id as string, body) }, { status: 201 });
  }),

  http.get(`${base()}${DOCTOR_PATHS.hospitals}`, () => HttpResponse.json({ data: listHospitals() })),
];
