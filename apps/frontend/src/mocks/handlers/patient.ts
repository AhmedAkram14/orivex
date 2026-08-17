import { http, HttpResponse } from 'msw';
import { env } from '@/shared/lib/env';
import { PATIENT_PATHS } from '@/features/patient/api/paths';
import type {
  BookAppointmentRequest,
  CancelAppointmentRequest,
  PatientProfileUpdateRequest,
  RescheduleAppointmentRequest,
  SubmitPatientVerificationRequest,
} from '@/features/patient/api/types';
import {
  bookAppointment,
  cancelAppointment,
  checkProfileExists,
  getActivePrescriptions,
  getAppointments,
  getDashboardSummary,
  getHealthDashboard,
  getMedicalRecords,
  getMyIdentityVerificationStatus,
  getPrescriptions,
  getProfile,
  getUpcomingAppointments,
  listMyVerifications,
  MockConflictError,
  MockInvalidStateError,
  MockNotFoundError,
  rescheduleAppointment,
  submitMyVerification,
  updateProfile,
} from '@/mocks/patient-store';
import { identityVerificationRequiredResponse, isPatientVerified } from '@/mocks/identity-verification-gate';
import { resolveRequestAccountId } from '@/mocks/request-account';

const base = () => env.apiBaseUrl;

function errorResponse(status: number, code: string, message: string) {
  return HttpResponse.json(
    { error: { code, message, requestId: 'mock', timestamp: new Date().toISOString() } },
    { status },
  );
}

export const patientHandlers = [
  // dashboardSummary/upcomingAppointments/activePrescriptions are real
  // endpoints (ClinicalModule's PatientDashboardController) -- these handlers
  // exist purely to keep the frontend test suite deterministic, matching
  // `profile`/`appointments` below.
  http.get(`${base()}${PATIENT_PATHS.dashboardSummary}`, ({ request }) =>
    HttpResponse.json({ data: getDashboardSummary(resolveRequestAccountId(request)) }),
  ),

  http.get(`${base()}${PATIENT_PATHS.upcomingAppointments}`, ({ request }) =>
    HttpResponse.json({ data: getUpcomingAppointments(resolveRequestAccountId(request)) }),
  ),

  http.get(`${base()}${PATIENT_PATHS.activePrescriptions}`, ({ request }) =>
    HttpResponse.json({ data: getActivePrescriptions(resolveRequestAccountId(request)) }),
  ),

  http.get(`${base()}${PATIENT_PATHS.profile}`, ({ request }) => {
    const found = getProfile(resolveRequestAccountId(request));
    if (!found) return errorResponse(404, 'NOT_FOUND', 'Patient profile not found.');
    return HttpResponse.json({ data: found });
  }),

  http.patch(`${base()}${PATIENT_PATHS.profile}`, async ({ request }) => {
    const body = (await request.json()) as PatientProfileUpdateRequest;
    const updated = updateProfile(body, resolveRequestAccountId(request));
    if (!updated) return errorResponse(404, 'NOT_FOUND', 'Patient profile not found.');
    return HttpResponse.json({ data: updated });
  }),

  http.get(`${base()}${PATIENT_PATHS.appointments}`, ({ request }) =>
    HttpResponse.json({ data: getAppointments(resolveRequestAccountId(request)) }),
  ),

  // Onboarding Redesign integration-gap closure (2026-07-25): the real
  // production booking endpoint -- matches the real backend's
  // RequiresIdentityVerificationGuard on POST /appointments exactly.
  http.post(`${base()}${PATIENT_PATHS.createAppointment}`, async ({ request }) => {
    if (!isPatientVerified(resolveRequestAccountId(request))) {
      return identityVerificationRequiredResponse();
    }
    const body = (await request.json()) as BookAppointmentRequest;
    try {
      return HttpResponse.json({ data: bookAppointment(body, resolveRequestAccountId(request)) }, { status: 201 });
    } catch {
      // Consultation Pricing Redesign: mirrors the real 409
      // AvailabilityWindowConflictError -- the window stopped being open
      // (booked by someone else) between the patient viewing it and
      // confirming.
      return errorResponse(409, 'CONFLICT', `AvailabilityWindow "${body.availabilityWindowId}" is no longer available.`);
    }
  }),

  // Patient-Facing Reschedule (Phase 3 Step 2) + Demo Readiness P0 (cancel):
  // the real production PATCH /appointments/:id endpoint -- matches the real
  // backend's exact status mapping (mapConsultationError / the shared
  // AppError hierarchy): 404 for a not-found/not-owned appointment, 409 for
  // the real optimistic-locking slot conflict (reschedule only), 422 for an
  // appointment that can no longer be rescheduled/cancelled from its current
  // status.
  http.patch(`${base()}${PATIENT_PATHS.appointment(':id')}`, async ({ params, request }) => {
    const id = params.id as string;
    const body = (await request.json()) as RescheduleAppointmentRequest | CancelAppointmentRequest;

    if (body.action === 'cancel') {
      try {
        return HttpResponse.json({ data: cancelAppointment(id, resolveRequestAccountId(request)) });
      } catch (error) {
        if (error instanceof MockNotFoundError) {
          return errorResponse(404, 'NOT_FOUND', error.message);
        }
        if (error instanceof MockInvalidStateError) {
          return errorResponse(422, 'VALIDATION_FAILED', error.message);
        }
        return errorResponse(422, 'VALIDATION_FAILED', 'Could not cancel this appointment.');
      }
    }

    if (body.action !== 'reschedule' || !body.newAvailabilityWindowId) {
      return errorResponse(422, 'VALIDATION_FAILED', 'newAvailabilityWindowId is required to reschedule.');
    }
    try {
      return HttpResponse.json({ data: rescheduleAppointment(id, body.newAvailabilityWindowId, resolveRequestAccountId(request)) });
    } catch (error) {
      if (error instanceof MockNotFoundError) {
        return errorResponse(404, 'NOT_FOUND', error.message);
      }
      if (error instanceof MockConflictError) {
        return errorResponse(409, 'CONFLICT', error.message);
      }
      if (error instanceof MockInvalidStateError) {
        return errorResponse(422, 'VALIDATION_FAILED', error.message);
      }
      return errorResponse(422, 'VALIDATION_FAILED', 'Could not reschedule this appointment.');
    }
  }),

  http.get(`${base()}${PATIENT_PATHS.medicalRecords}`, ({ request }) =>
    HttpResponse.json({ data: getMedicalRecords(resolveRequestAccountId(request)) }),
  ),

  http.get(`${base()}${PATIENT_PATHS.prescriptions}`, ({ request }) =>
    HttpResponse.json({ data: getPrescriptions(resolveRequestAccountId(request)) }),
  ),

  http.get(`${base()}${PATIENT_PATHS.healthDashboard}`, ({ request }) =>
    HttpResponse.json({ data: getHealthDashboard(resolveRequestAccountId(request)) }),
  ),

  // Onboarding Redesign (2026-07-21 proposal, Stage O.5): the Choose-Your-
  // Journey gate's side-effect-free existence check.
  http.get(`${base()}${PATIENT_PATHS.exists}`, ({ request }) =>
    HttpResponse.json({ data: { exists: checkProfileExists(resolveRequestAccountId(request)) } }),
  ),

  // Onboarding Redesign (2026-07-21 proposal, Stage O.4/O.7): registered
  // before `/patients/:id/verifications` below so this literal path always
  // wins the match.
  http.get(`${base()}${PATIENT_PATHS.identityVerificationStatus}`, ({ request }) =>
    HttpResponse.json({ data: getMyIdentityVerificationStatus(resolveRequestAccountId(request)) }),
  ),

  http.post(`${base()}/patients/:id/verifications`, async ({ request }) => {
    const body = (await request.json()) as SubmitPatientVerificationRequest;
    return HttpResponse.json({ data: submitMyVerification(body, resolveRequestAccountId(request)) }, { status: 201 });
  }),

  http.get(`${base()}/patients/:id/verifications`, ({ request }) =>
    HttpResponse.json({ data: listMyVerifications(resolveRequestAccountId(request)) }),
  ),
];
