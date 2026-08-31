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
import {
  approveAppointment,
  getAccountIdForPatientProfileId,
  getAppointments,
  getMedicalRecords,
  getPatientProfileById,
  getPendingApprovalAppointments,
  getPrescriptions,
} from '@/mocks/patient-store';
import { getDocumentsForAccount } from '@/mocks/media-asset-store';
import { listInsuranceProviders } from '@/mocks/reference-store';
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

  // Doctor-facing Patient Chart (protected): mirrors the real backend's
  // DoctorPatientChartController -- a real relationship check (does
  // getPatients(callingAccountId) include this patient?) before returning
  // anything, same ownership-safe 404 on failure, never a client-side-only
  // gate. DOCTOR-OWNED ENCOUNTERS ONLY: medical-records/prescriptions are
  // filtered to entries this doctor authored (best-effort in this mock
  // layer, matched by doctor display name -- the mock stores don't track a
  // per-entry authoring doctor id the way the real domain does).
  http.get(`${base()}/doctor/patients/:id/profile`, ({ params, request }) => {
    const callingAccountId = resolveRequestAccountId(request);
    const patientId = params.id as string;
    const myPatients = getPatients(callingAccountId);
    const isOwnPatient = myPatients.some((patient) => patient.patientProfileId === patientId);
    if (!isOwnPatient) return notFound('Patient not found.');

    const profile = getPatientProfileById(patientId);
    if (!profile) return notFound('Patient not found.');

    const insuranceProviderName = listInsuranceProviders().find((provider) => provider.id === profile.insuranceProviderId)?.name;
    return HttpResponse.json({
      data: {
        id: profile.id,
        accountId: getAccountIdForPatientProfileId(profile.id) ?? '',
        fullName: profile.fullName,
        email: profile.email,
        phoneNumber: profile.phoneNumber,
        avatarUrl: profile.avatarUrl,
        dateOfBirth: profile.dateOfBirth,
        gender: profile.gender,
        nationalityId: profile.nationalityId,
        address: profile.address,
        bloodType: profile.bloodType,
        allergies: profile.allergies,
        chronicDiseases: profile.chronicDiseases,
        insuranceProviderId: profile.insuranceProviderId,
        insuranceProviderName,
        emergencyContacts: profile.emergencyContacts,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    });
  }),

  http.get(`${base()}/doctor/patients/:id/appointments`, ({ params, request }) => {
    const callingAccountId = resolveRequestAccountId(request);
    const patientId = params.id as string;
    const isOwnPatient = getPatients(callingAccountId).some((patient) => patient.patientProfileId === patientId);
    if (!isOwnPatient) return notFound('Patient not found.');

    const callingDoctor = getDoctorByAccountId(callingAccountId ?? '');
    const patientAccountId = getAccountIdForPatientProfileId(patientId);
    const own = getAppointments(patientAccountId).filter((appointment) => appointment.doctorId === callingDoctor?.id);
    return HttpResponse.json({ data: own });
  }),

  http.get(`${base()}/doctor/patients/:id/medical-records`, ({ params, request }) => {
    const callingAccountId = resolveRequestAccountId(request);
    const patientId = params.id as string;
    const isOwnPatient = getPatients(callingAccountId).some((patient) => patient.patientProfileId === patientId);
    if (!isOwnPatient) return notFound('Patient not found.');

    const callingDoctor = getDoctorByAccountId(callingAccountId ?? '');
    const patientAccountId = getAccountIdForPatientProfileId(patientId);
    const own = getMedicalRecords(patientAccountId).filter((entry) => entry.doctorName === callingDoctor?.fullName);
    return HttpResponse.json({ data: own });
  }),

  http.get(`${base()}/doctor/patients/:id/prescriptions`, ({ params, request }) => {
    const callingAccountId = resolveRequestAccountId(request);
    const patientId = params.id as string;
    const isOwnPatient = getPatients(callingAccountId).some((patient) => patient.patientProfileId === patientId);
    if (!isOwnPatient) return notFound('Patient not found.');

    const callingDoctor = getDoctorByAccountId(callingAccountId ?? '');
    const patientAccountId = getAccountIdForPatientProfileId(patientId);
    const own = getPrescriptions(patientAccountId).filter((prescription) => prescription.prescribedBy === callingDoctor?.fullName);
    return HttpResponse.json({ data: own });
  }),

  // MSW Demo Clinical Documents fix: reads media-asset-store.ts's own
  // account-keyed MockMediaAsset list, seeded (demo-seeder.ts) with only the
  // two real clinical purposes -- never identity-verification documents,
  // matching CLINICAL_MEDIA_ASSET_PURPOSES on the real backend. An honest
  // empty list for any patient never seeded with one.
  http.get(`${base()}/doctor/patients/:id/documents`, ({ params, request }) => {
    const callingAccountId = resolveRequestAccountId(request);
    const patientId = params.id as string;
    const isOwnPatient = getPatients(callingAccountId).some((patient) => patient.patientProfileId === patientId);
    if (!isOwnPatient) return notFound('Patient not found.');

    const patientAccountId = getAccountIdForPatientProfileId(patientId);
    return HttpResponse.json({ data: getDocumentsForAccount(patientAccountId) });
  }),
];
