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
  getDoctorByAccountId,
  getDoctorById,
  getPatients,
  getProfile,
  getQueue,
  getReportsSummary,
  getUpcomingWork,
  listDoctors,
  listVerifications,
  registerProfile,
  submitVerification,
  updateProfile,
} from '@/mocks/doctor-store';
import { listDepartments, listHospitals } from '@/mocks/admin-store';
import { approveAppointment, getPendingApprovalAppointments } from '@/mocks/patient-store';
import { resolveRequestAccountId } from '@/mocks/request-account';

const base = () => env.apiBaseUrl;

function notFound(message: string) {
  return HttpResponse.json(
    { error: { code: 'NOT_FOUND', message, requestId: 'mock', timestamp: new Date().toISOString() } },
    { status: 404 },
  );
}

export const doctorHandlers = [
  // Every route below is a real endpoint (DoctorModule's DoctorProfileController,
  // TrustModule's DoctorVerificationController, AdministrationModule's public
  // hospital directory, ClinicalModule/ConsultationModule's dashboard-summary/
  // upcoming-work/queue routes) -- these handlers exist purely to keep the
  // frontend test suite deterministic, matching `patient.ts`/`scheduling.ts`.
  // Demo Data & Profile Avatar Pass: every doctor-self-scoped route below
  // resolves the caller's own account from the intercepted request (bearer
  // token -> mock session -> legacy demo doctor, see `request-account.ts`)
  // and reads that account's own slice of `doctor-store.ts`, instead of the
  // single shared profile every doctor used to see.
  http.get(`${base()}${DOCTOR_PATHS.dashboardSummary}`, ({ request }) =>
    HttpResponse.json({ data: getDashboardSummary(resolveRequestAccountId(request)) }),
  ),

  http.get(`${base()}${DOCTOR_PATHS.upcomingWork}`, ({ request }) =>
    HttpResponse.json({ data: getUpcomingWork(resolveRequestAccountId(request)) }),
  ),

  http.get(`${base()}${DOCTOR_PATHS.profile}`, ({ request }) => {
    const found = getProfile(resolveRequestAccountId(request));
    if (!found) return notFound('Doctor profile not found.');
    return HttpResponse.json({ data: found });
  }),

  http.patch(`${base()}${DOCTOR_PATHS.profile}`, async ({ request }) => {
    const body = (await request.json()) as DoctorProfileUpdateRequest;
    const updated = updateProfile(body, resolveRequestAccountId(request));
    if (!updated) return notFound('Doctor profile not found.');
    return HttpResponse.json({ data: updated });
  }),

  http.get(`${base()}${DOCTOR_PATHS.queue}`, ({ request }) =>
    HttpResponse.json({ data: getQueue(resolveRequestAccountId(request)) }),
  ),

  // Doctor Workspace dashboard redesign: real distinct-patient list and real
  // appointment-status/rating summary (ConsultationModule's
  // AppointmentController) -- these mocks exist purely to keep the frontend
  // test suite deterministic, matching `getDashboardSummary()`'s precedent.
  http.get(`${base()}${DOCTOR_PATHS.patients}`, ({ request }) =>
    HttpResponse.json({ data: getPatients(resolveRequestAccountId(request)) }),
  ),

  http.get(`${base()}${DOCTOR_PATHS.reportsSummary}`, ({ request }) =>
    HttpResponse.json({ data: getReportsSummary(resolveRequestAccountId(request)) }),
  ),

  // Doctor-approval-workflow fix: every booking (Free or Paid) now lands
  // Requested and waits here until the doctor approves it.
  http.get(`${base()}${DOCTOR_PATHS.pendingApproval}`, ({ request }) =>
    HttpResponse.json({ data: getPendingApprovalAppointments(resolveRequestAccountId(request)) }),
  ),

  http.patch(`${base()}/appointments/:id/approve`, ({ params }) =>
    HttpResponse.json({ data: approveAppointment(params.id as string) }),
  ),

  // Doctor Onboarding (Phase 4 continuation).
  http.post(`${base()}${DOCTOR_PATHS.register}`, async ({ request }) => {
    const body = (await request.json()) as RegisterDoctorProfileRequest;
    return HttpResponse.json({ data: registerProfile(body, resolveRequestAccountId(request)) }, { status: 201 });
  }),

  http.get(`${base()}/doctors/:id/verifications`, ({ params, request }) =>
    HttpResponse.json({ data: listVerifications(params.id as string, resolveRequestAccountId(request)) }),
  ),

  http.post(`${base()}/doctors/:id/verifications`, async ({ request, params }) => {
    const body = (await request.json()) as SubmitVerificationRequest;
    return HttpResponse.json(
      { data: submitVerification(params.id as string, body, resolveRequestAccountId(request)) },
      { status: 201 },
    );
  }),

  http.get(`${base()}${DOCTOR_PATHS.hospitals}`, () => HttpResponse.json({ data: listHospitals() })),

  // Onboarding Redesign (2026-07-21 proposal, Stage O.6): the doctor-facing
  // mirror of AdministrationController's SuperAdmin-only departments route
  // -- reuses admin-store's own listDepartments() so both surfaces stay in
  // sync in tests.
  http.get(`${base()}/hospitals/:id/departments`, ({ params }) => {
    const result = listDepartments(params.id as string);
    if (!result.ok) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Hospital not found.', requestId: 'mock', timestamp: new Date().toISOString() } },
        { status: 404 },
      );
    }
    return HttpResponse.json({ data: result.departments });
  }),

  // Onboarding Redesign (2026-07-21 proposal, Stage O.5): the Patient
  // Dashboard's Browse/Search Doctors + doctor profile view. Registered
  // after `/doctors/me` above so that literal path always wins the match.
  http.get(`${base()}${DOCTOR_PATHS.list}`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const limit = Number(url.searchParams.get('limit') ?? '50');
    const specialty = url.searchParams.get('specialty') ?? undefined;
    const specialtyId = url.searchParams.get('specialtyId') ?? undefined;
    const hospitalId = url.searchParams.get('hospitalId') ?? undefined;
    return HttpResponse.json({ data: listDoctors({ page, limit, specialty, specialtyId, hospitalId }) });
  }),

  // Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8):
  // SuperAdmin-only lookup by account id -- registered before the generic
  // `/doctors/:id` handler below so this more-specific path always wins the
  // match first, mirroring the real backend's own route-registration order.
  http.get(`${base()}/doctors/by-account/:accountId`, ({ params }) => {
    const found = getDoctorByAccountId(params.accountId as string);
    if (!found) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Doctor profile not found.', requestId: 'mock', timestamp: new Date().toISOString() } },
        { status: 404 },
      );
    }
    return HttpResponse.json({ data: found });
  }),

  http.get(`${base()}/doctors/:id`, ({ params }) => {
    const found = getDoctorById(params.id as string);
    if (!found) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Doctor profile not found.', requestId: 'mock', timestamp: new Date().toISOString() } },
        { status: 404 },
      );
    }
    return HttpResponse.json({ data: found });
  }),
];
