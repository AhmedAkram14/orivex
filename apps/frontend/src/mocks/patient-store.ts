import type {
  ActivePrescriptionPreview,
  Appointment,
  BookAppointmentRequest,
  BookedAppointment,
  HealthVitalSummary,
  IdentityVerificationStatus,
  MedicalRecordEntry,
  PatientDashboardSummary,
  PatientProfile,
  PatientProfileUpdateRequest,
  Prescription,
  RescheduledAppointment,
  SubmitPatientVerificationRequest,
  UpcomingAppointmentPreview,
} from '@/features/patient/api/types';
import type { VerificationCase } from '@/shared/verification/types';
import type { VerificationCase as AdminVerificationCase } from '@/features/admin/api/types';
import { getDoctorById } from '@/mocks/doctor-store';
import { listSpecialties } from '@/mocks/reference-store';
import { isAvailabilityWindowBooked, markAvailabilityWindowBooked, resolveWindowPricing } from '@/mocks/scheduling-store';
import {
  findAllVerificationCasesBySubject,
  decideVerificationCase,
  setSubjectVerificationCases,
  submitVerificationCase,
  suspendVerificationCase,
} from '@/mocks/verification-case-store';

const PATIENT_SUBJECT_ACCOUNT_ID = 'user-patient-1';

/**
 * In-memory mock "backend" state for `/patient/*` — mirrors
 * `doctor-store.ts`'s pattern. `dashboardSummary`/`upcomingAppointments`/
 * `activePrescriptions` are now real backend endpoints (ClinicalModule's
 * PatientDashboardController), so these seeds exist purely to keep the
 * frontend test suite deterministic (`mocks/handlers/patient.ts` intercepts
 * them in tests the same way it already does for `seedProfile()`/
 * `seedAppointments()`) -- an honest empty/zero reality since the seeded
 * mock account has no real appointments or prescriptions on record.
 */
function seedSummary(): PatientDashboardSummary {
  return { upcomingAppointmentsCount: 0, activePrescriptionsCount: 0 };
}

function seedUpcomingAppointments(): UpcomingAppointmentPreview[] {
  return [];
}

function seedActivePrescriptions(): ActivePrescriptionPreview[] {
  return [];
}

/**
 * The patient profile is administrative/contact data (name, DOB, contact
 * info, emergency contacts), so — unlike the summary/preview lists above —
 * a believable seed is appropriate here, matching `auth-store.ts`'s
 * `patient@orivex.dev` / "Amina Youssef" mock account for continuity. This
 * mock now exists purely to keep the frontend test suite deterministic
 * (`GET /patients/me` is a real backend endpoint, `mocks/handlers/patient.ts`
 * intercepts it in tests the same way `mocks/handlers/auth.ts` still mocks
 * the also-real `/auth/*` endpoints) — matches the real
 * `PatientProfileResponseDto` shape exactly: no `gender`/`address`/
 * `medicalInfo`, since none of those exist on the backend.
 */
function seedProfile(): PatientProfile {
  return {
    id: 'patient-profile-1',
    fullName: 'Amina Youssef',
    dateOfBirth: '1990-04-12',
    email: 'patient@orivex.dev',
    phoneNumber: '+20 100 111 2222',
    gender: 'female',
    nationalityId: 'country-eg',
    address: '12 Tahrir Street, Cairo',
    bloodType: 'A+',
    allergies: 'Penicillin',
    chronicDiseases: undefined,
    insuranceProviderId: undefined,
    emergencyContacts: [
      { id: 'contact-1', name: 'Mona Youssef', relationship: 'sibling', phoneNumber: '+20 100 333 4444' },
    ],
  };
}

/**
 * The full appointment list — `GET /appointments/me` is a real backend
 * endpoint (ConsultationModule's AppointmentController), so this mock now
 * exists purely to keep the frontend test suite deterministic, matching
 * `seedProfile()`'s reasoning. An honest empty array: the seeded test
 * account has never booked a real appointment.
 */
function seedAppointments(): Appointment[] {
  return [];
}

/**
 * The Medical Records timeline -- `GET /patients/me/medical-records` is now
 * a real backend endpoint (ClinicalModule's PatientDashboardController),
 * composed from `ClinicalNote`/`HealthGraphNode`; this mock exists purely to
 * keep the frontend test suite deterministic, matching `seedProfile()`'s
 * precedent. An honest empty array: the seeded mock account has no real
 * clinical notes or condition nodes on record. `downloadUrl` never gets a
 * fabricated value on any seeded entry (there is none to seed yet), keeping
 * `RecordDownloadButton` architecture-ready but never rendered on fake data.
 */
function seedMedicalRecords(): MedicalRecordEntry[] {
  return [];
}

/**
 * The full prescription list -- `GET /patients/me/prescriptions` is now a
 * real backend endpoint (ClinicalModule's PatientDashboardController), so
 * this mock exists purely to keep the frontend test suite deterministic,
 * matching `seedProfile()`'s precedent. An honest empty array: the seeded
 * mock account has no real prescriptions on record.
 */
function seedPrescriptions(): Prescription[] {
  return [];
}

/**
 * The Health Dashboard's vitals — `GET /patients/me/health-dashboard` is a
 * real backend endpoint (ClinicalModule's PatientDashboardController); this
 * mock now exists purely to keep the frontend test suite deterministic,
 * matching `seedProfile()`'s precedent. An honest empty array per vital
 * type: the seeded test account has no real vital readings recorded (no
 * producer/UI writes them yet), so `latest`/`readings` are never fabricated.
 */
function seedHealthDashboard(): HealthVitalSummary[] {
  return [
    { type: 'weight', latest: undefined, readings: [] },
    { type: 'blood-pressure', latest: undefined, readings: [] },
    { type: 'blood-sugar', latest: undefined, readings: [] },
  ];
}

// Onboarding Redesign (2026-07-21 proposal, Stage O.4/O.7): the seeded
// `patient@orivex.dev` account is a fully-provisioned demo patient (already
// Approved), matching `doctor-store.ts`'s own "already-provisioned demo
// doctor" precedent -- every other gated-action test that isn't itself
// about the identity-verification gate keeps working unmodified. Tests
// exercising the gate itself override this directly via `server.use()`
// (the `onboarding-flow.test.tsx` precedent) or by resetting the store.
// Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8):
// backed by the shared `verification-case-store.ts` (not a local array) so
// this same case is the one the admin verification queue also sees.
function seedVerifications(): AdminVerificationCase[] {
  return [
    {
      id: 'verification-1',
      subjectAccountId: PATIENT_SUBJECT_ACCOUNT_ID,
      subjectType: 'patient',
      status: 'approved',
      submittedAt: '2026-01-01T00:00:00.000Z',
      decidedAt: '2026-01-02T00:00:00.000Z',
      documentAssetIds: ['seed-national-id-front', 'seed-national-id-back', 'seed-selfie-with-id'],
    },
  ];
}

let summary: PatientDashboardSummary = seedSummary();
let upcomingAppointments: UpcomingAppointmentPreview[] = seedUpcomingAppointments();
let activePrescriptions: ActivePrescriptionPreview[] = seedActivePrescriptions();
let profile: PatientProfile = seedProfile();
let appointments: Appointment[] = seedAppointments();
let medicalRecords: MedicalRecordEntry[] = seedMedicalRecords();
let prescriptions: Prescription[] = seedPrescriptions();
let healthDashboard: HealthVitalSummary[] = seedHealthDashboard();
setSubjectVerificationCases('patient', PATIENT_SUBJECT_ACCOUNT_ID, seedVerifications());

export function getDashboardSummary(): PatientDashboardSummary {
  return summary;
}

export function getUpcomingAppointments(): UpcomingAppointmentPreview[] {
  return upcomingAppointments;
}

export function getActivePrescriptions(): ActivePrescriptionPreview[] {
  return activePrescriptions;
}

export function getProfile(): PatientProfile {
  return profile;
}

// Onboarding Redesign (2026-07-21 proposal, Stage O.5): the Choose-Your-
// Journey gate's side-effect-free existence check. This mock store always
// has a seeded profile (`seedProfile()` above), so it always reports true --
// matching real production reality for `patient@orivex.dev`, an already-
// onboarded demo account. Component tests that need to exercise the
// "no profile yet" gate override this handler directly via `server.use()`
// (the same pattern `onboarding-flow.test.tsx` already uses for /doctors/me).
export function checkProfileExists(): boolean {
  return true;
}

export function updateProfile(request: PatientProfileUpdateRequest): PatientProfile {
  profile = {
    ...profile,
    bloodType: request.bloodType ?? profile.bloodType,
    allergies: request.allergies ?? profile.allergies,
    chronicDiseases: request.chronicDiseases ?? profile.chronicDiseases,
    insuranceProviderId: request.insuranceProviderId ?? profile.insuranceProviderId,
    emergencyContacts:
      request.emergencyContacts?.map((contact, index) => ({
        id: contact.id ?? `contact-${Date.now()}-${index}`,
        name: contact.name,
        relationship: contact.relationship,
        phoneNumber: contact.phoneNumber,
      })) ?? profile.emergencyContacts,
  };
  return profile;
}

export function getAppointments(): Appointment[] {
  return appointments;
}

/**
 * Test-only seam: seeds a Completed appointment linked to a real
 * ConsultationSession id, so an E2E spec can drive the real
 * `ConsultationOutcomeAction` (post-consultation summary + rating) without
 * re-driving the full book -> join -> disconnect/reconnect -> complete
 * chain through a real LiveKit connection (this mock system's independent
 * appointment/consultation-session stores don't auto-sync a status flip the
 * way the real backend's shared aggregate would -- see
 * `mock-provider.tsx`'s own doc comment). Never called from application
 * code.
 */
export function seedCompletedAppointment(consultationSessionId: string, doctor: { name: string; specialty: string }): void {
  appointments = [
    {
      id: `appointment-${consultationSessionId}`,
      scheduledAt: new Date().toISOString(),
      // This mock system has exactly one seeded demo doctor
      // (`doctor-profile-1`, see `doctor-store.ts`) -- same convention
      // `bookAppointment`/`rescheduleAppointment` below rely on.
      doctorId: 'doctor-profile-1',
      doctorName: doctor.name,
      specialization: doctor.specialty,
      specializationAr: null,
      status: 'completed',
      consultationType: 'paid',
      reasonForVisit: undefined,
      consultationSessionId,
      paymentRequired: false,
      feeAmount: null,
    },
    ...appointments,
  ];
}

/**
 * Onboarding Redesign integration-gap closure (2026-07-25): mocks the real
 * `POST /appointments` contract -- a Free booking confirms immediately, a
 * Paid one stays `requested` with `paymentRequired` and a minted
 * `consultationSessionId` (mirrors `BookAppointmentUseCase`'s own free/paid
 * branch), so `PayNowForm`'s existing, real payment continuation has
 * something genuine to act on. The availability window's start time is
 * encoded in its own id (`${doctorId}::${isoStart}`, see
 * `scheduling-store.ts`'s `getAvailabilityWindows`) -- this mock has no
 * separate window table to look it up in.
 *
 * Consultation Pricing Redesign: the appointment's price is the window's
 * own real price (`resolveWindowPricing`, snapshotted at booking time,
 * mirroring the real `Appointment.request()`'s own snapshot-not-live-read
 * behavior) -- never a client-supplied `consultationType` (the request no
 * longer carries one) or the doctor's profile-level fee. Throws if the
 * window is already booked (mirrors the real backend's 409
 * `AvailabilityWindowConflictError`) -- the handler (`patient.ts`) maps this
 * to the same status.
 */
export function bookAppointment(request: BookAppointmentRequest): BookedAppointment {
  if (isAvailabilityWindowBooked(request.availabilityWindowId)) {
    throw new Error(`AvailabilityWindow "${request.availabilityWindowId}" is no longer available.`);
  }

  const doctor = getDoctorById(request.doctorId);
  const scheduledAt = request.availabilityWindowId.split('::')[1] ?? new Date().toISOString();
  const pricing = resolveWindowPricing(request.doctorId, scheduledAt);
  const isPaid = pricing.pricingType === 'paid';
  const id = `appointment-${Date.now()}`;

  markAvailabilityWindowBooked(request.availabilityWindowId);

  // Doctor-approval-workflow fix: every booking (Free or Paid) now lands
  // Requested with no session yet -- both wait for the doctor's explicit
  // approval (mirrors BookAppointmentUseCase's real removal of its own
  // former auto-confirm-both workaround).
  const matchedSpecialty = doctor && listSpecialties().find((specialty) => specialty.id === doctor.specialtyId);
  const listItem: Appointment = {
    id,
    scheduledAt,
    doctorId: request.doctorId,
    doctorName: doctor?.fullName ?? 'Doctor',
    specialization: matchedSpecialty?.name ?? '',
    specializationAr: matchedSpecialty?.nameAr ?? null,
    status: 'requested',
    consultationType: pricing.pricingType,
    reasonForVisit: request.reasonForVisit,
    consultationSessionId: null,
    paymentRequired: isPaid,
    feeAmount: isPaid && pricing.feeAmount !== null && pricing.feeCurrency !== null ? { amount: pricing.feeAmount, currency: pricing.feeCurrency } : null,
  };
  appointments = [listItem, ...appointments];

  return {
    id,
    patientId: 'patient-profile-1',
    doctorId: request.doctorId,
    availabilityWindowId: request.availabilityWindowId,
    consultationType: pricing.pricingType,
    feeAmount: pricing.feeAmount,
    feeCurrency: pricing.feeCurrency,
    status: listItem.status,
    scheduledAt,
    reasonForVisit: request.reasonForVisit ?? null,
    rescheduledFromId: null,
  };
}

// Patient-Facing Reschedule (Phase 3 Step 2): distinct mock error types so
// `mocks/handlers/patient.ts` can map each to the exact real HTTP status the
// backend's `mapConsultationError`/global exception filter would produce --
// 404 (NotFoundError: appointment or new window not found/not owned), 409
// (ConflictError: the new slot was reserved/booked by someone else), 422
// (ValidationError: the appointment can't be rescheduled from its current
// status). Never a single generic thrown Error -- these three real,
// distinguishable failure modes are exactly what the real backend produces.
export class MockNotFoundError extends Error {}
export class MockConflictError extends Error {}
export class MockInvalidStateError extends Error {}

/**
 * Patient-Facing Reschedule (Phase 3 Step 2): mocks the real
 * `PATCH /appointments/:id` (`action: 'reschedule'`) contract exactly --
 * mirrors `RescheduleOrCancelAppointmentUseCase.reschedule()`'s own real
 * behavior: only a Requested/Confirmed appointment can be rescheduled, the
 * OLD appointment moves to Rescheduled (terminal), a brand-new appointment
 * is created on the new slot (never a mutation of the same row -- matches
 * the real backend's forward-only rule), snapshotting the NEW window's own
 * price (never the old appointment's). A Free new slot auto-confirms
 * immediately (mints a real session id, same as `confirmAppointment` does);
 * a Paid one stays Requested/unpaid, exactly like a fresh booking.
 */
export function rescheduleAppointment(appointmentId: string, newAvailabilityWindowId: string): RescheduledAppointment {
  const existing = appointments.find((entry) => entry.id === appointmentId);
  if (!existing) {
    throw new MockNotFoundError(`Appointment "${appointmentId}" not found.`);
  }
  if (existing.status !== 'requested' && existing.status !== 'confirmed') {
    throw new MockInvalidStateError(`Appointment "${appointmentId}" cannot be rescheduled from its current status.`);
  }
  if (isAvailabilityWindowBooked(newAvailabilityWindowId)) {
    throw new MockConflictError(`AvailabilityWindow "${newAvailabilityWindowId}" is no longer available.`);
  }

  const doctorId = existing.doctorId;
  const doctor = getDoctorById(doctorId);
  const scheduledAt = newAvailabilityWindowId.split('::')[1] ?? new Date().toISOString();
  const pricing = resolveWindowPricing(doctorId, scheduledAt);
  const isPaid = pricing.pricingType === 'paid';
  const newId = `appointment-${Date.now()}`;
  const newStatus: Appointment['status'] = isPaid ? 'requested' : 'confirmed';

  markAvailabilityWindowBooked(newAvailabilityWindowId);
  existing.status = 'rescheduled';

  const matchedSpecialty = doctor && listSpecialties().find((specialty) => specialty.id === doctor.specialtyId);
  const listItem: Appointment = {
    id: newId,
    scheduledAt,
    doctorId,
    doctorName: doctor?.fullName ?? existing.doctorName,
    specialization: matchedSpecialty?.name ?? existing.specialization,
    specializationAr: matchedSpecialty?.nameAr ?? existing.specializationAr,
    status: newStatus,
    consultationType: pricing.pricingType,
    reasonForVisit: existing.reasonForVisit,
    consultationSessionId: newStatus === 'confirmed' ? `session-${newId}` : null,
    paymentRequired: isPaid,
    feeAmount:
      isPaid && pricing.feeAmount !== null && pricing.feeCurrency !== null
        ? { amount: pricing.feeAmount, currency: pricing.feeCurrency }
        : null,
  };
  appointments = [listItem, ...appointments];

  return {
    id: newId,
    patientId: 'patient-profile-1',
    doctorId,
    availabilityWindowId: newAvailabilityWindowId,
    consultationType: pricing.pricingType,
    feeAmount: pricing.feeAmount,
    feeCurrency: pricing.feeCurrency,
    status: newStatus,
    scheduledAt,
    reasonForVisit: existing.reasonForVisit ?? null,
    rescheduledFromId: appointmentId,
  };
}

/**
 * Demo Readiness P0: mocks the real `PATCH /appointments/:id`
 * (`action: 'cancel'`) contract exactly -- mirrors
 * `RescheduleOrCancelAppointmentUseCase.cancel()`'s own real behavior: only
 * a Requested/Confirmed appointment can be cancelled (the same real
 * `MockNotFoundError`/`MockInvalidStateError` reschedule already throws),
 * the appointment moves straight to Cancelled (terminal, in-place -- unlike
 * reschedule, cancel never creates a new appointment row). No refund
 * simulation lives here: the real backend's auto-refund
 * (`AutoRefundOnAppointmentCancellationHandler`) is server-side business
 * logic this frontend mock never re-implements, matching this feature's own
 * "don't touch payment/refund logic" scope.
 */
export function cancelAppointment(appointmentId: string): BookedAppointment {
  const existing = appointments.find((entry) => entry.id === appointmentId);
  if (!existing) {
    throw new MockNotFoundError(`Appointment "${appointmentId}" not found.`);
  }
  if (existing.status !== 'requested' && existing.status !== 'confirmed') {
    throw new MockInvalidStateError(`Appointment "${appointmentId}" cannot be cancelled from its current status.`);
  }

  existing.status = 'cancelled';
  existing.paymentRequired = false;

  return {
    id: existing.id,
    patientId: 'patient-profile-1',
    doctorId: existing.doctorId,
    availabilityWindowId: `${existing.doctorId}::${existing.scheduledAt}`,
    consultationType: existing.consultationType,
    feeAmount: existing.feeAmount?.amount ?? null,
    feeCurrency: existing.feeAmount?.currency ?? null,
    status: existing.status,
    scheduledAt: existing.scheduledAt,
    reasonForVisit: existing.reasonForVisit ?? null,
    rescheduledFromId: null,
  };
}

/**
 * Consultation Pricing Lifecycle Completion (pay-then-confirm): Paid
 * appointments no longer wait on doctor approval at all -- they confirm
 * automatically once payment succeeds (`confirmAppointmentAfterPayment`
 * below). A Paid appointment sitting `requested` just means the patient
 * hasn't paid yet, nothing for the doctor to act on here (mirrors the real
 * `DoctorAppointmentsController.getPendingApproval`'s own filter).
 */
export function getPendingApprovalAppointments(): {
  id: string;
  patientName: string;
  scheduledAt: string;
  reasonForVisit?: string;
  consultationType: 'free' | 'paid';
}[] {
  return appointments
    .filter((appointment) => appointment.status === 'requested' && appointment.consultationType === 'free')
    .map((appointment) => ({
      id: appointment.id,
      patientName: 'Amina Youssef',
      scheduledAt: appointment.scheduledAt,
      reasonForVisit: appointment.reasonForVisit,
      consultationType: appointment.consultationType,
    }));
}

export function getAppointmentById(appointmentId: string): Appointment | undefined {
  return appointments.find((entry) => entry.id === appointmentId);
}

function confirmAppointment(appointmentId: string): { id: string; status: string } {
  const appointment = appointments.find((entry) => entry.id === appointmentId);
  if (!appointment) {
    throw new Error(`Appointment "${appointmentId}" not found.`);
  }
  appointment.status = 'confirmed';
  appointment.consultationSessionId = `session-${appointmentId}`;
  return { id: appointment.id, status: appointment.status };
}

/** Doctor-approval-workflow fix: approving (Free appointments only) mints the session and moves the appointment into the real (Confirmed) queue. */
export function approveAppointment(appointmentId: string): { id: string; status: string } {
  return confirmAppointment(appointmentId);
}

/** Consultation Pricing Lifecycle Completion: mirrors the real InitiateChargeUseCase's own confirm-on-success call. */
export function confirmAppointmentAfterPayment(appointmentId: string): { id: string; status: string } {
  return confirmAppointment(appointmentId);
}

export function getMedicalRecords(): MedicalRecordEntry[] {
  return medicalRecords;
}

export function getPrescriptions(): Prescription[] {
  return prescriptions;
}

export function getHealthDashboard(): HealthVitalSummary[] {
  return healthDashboard;
}

// Onboarding Redesign (2026-07-21 proposal, Stage O.4/O.7). Onboarding
// Redesign integration-gap closure (2026-07-25, Stage O.8): reads from the
// shared `verification-case-store.ts` -- the same case an admin sees.
export function getMyIdentityVerificationStatus(): IdentityVerificationStatus {
  const latest = findAllVerificationCasesBySubject('patient', PATIENT_SUBJECT_ACCOUNT_ID)[0];
  const status = latest?.status ?? 'not_submitted';
  return { status, isVerified: status === 'approved' };
}

export function listMyVerifications(): VerificationCase[] {
  return findAllVerificationCasesBySubject('patient', PATIENT_SUBJECT_ACCOUNT_ID);
}

export function submitMyVerification(request: SubmitPatientVerificationRequest): VerificationCase {
  return submitVerificationCase({
    subjectAccountId: PATIENT_SUBJECT_ACCOUNT_ID,
    subjectType: 'patient',
    documentAssetIds: request.documentAssetIds,
  });
}

/**
 * Test-only: simulates an admin approving the applicant's latest
 * verification case -- lets tests exercising "gated action -> verify ->
 * Approved -> return" end-to-end still work without driving the real admin
 * UI, alongside the real admin decision flow (Stage O.8) which now also
 * writes to this same shared store. Never called from application code.
 */
export function approveMyLatestVerification(): void {
  const latest = findAllVerificationCasesBySubject('patient', PATIENT_SUBJECT_ACCOUNT_ID)[0];
  if (!latest) return;
  decideVerificationCase(latest.id, 'approved');
}

/**
 * Test-only: simulates an admin rejecting the applicant's latest verification
 * case -- lets tests seed a genuine "Rejected, backed by the real shared
 * store" starting state (rather than a static `server.use()` GET override
 * that can never reflect a later resubmission) before driving the real
 * "Edit and resubmit" -> Documents -> Review -> Submit UI flow, so the
 * resubmission's resulting new case is the one the applicant's own status
 * view genuinely re-fetches and reflects. Never called from application code.
 */
export function rejectMyLatestVerification(reason: string): void {
  const latest = findAllVerificationCasesBySubject('patient', PATIENT_SUBJECT_ACCOUNT_ID)[0];
  if (!latest) return;
  decideVerificationCase(latest.id, 'rejected', reason);
}

/**
 * Test-only: simulates an admin suspending the applicant's latest (Approved)
 * verification case -- the exact same `suspendVerificationCase` function the
 * real admin Suspend button (Stage O.8) calls, so this proves the same
 * domain effect (Approved -> Suspended -> identity-verification-status
 * reports unverified again) without needing a second, admin-role browser
 * session in the same E2E spec. Never called from application code.
 */
export function suspendMyLatestVerification(reason: string): void {
  const latest = findAllVerificationCasesBySubject('patient', PATIENT_SUBJECT_ACCOUNT_ID)[0];
  if (!latest) return;
  suspendVerificationCase(latest.id, reason);
}

/**
 * Test-only: flips the seeded account between "already Approved" (the
 * default, matching every other gated-action test's assumption of an
 * already-provisioned demo patient) and "never submitted" (to exercise the
 * gate itself). Never called from application code.
 */
export function setPatientVerified(verified: boolean): void {
  setSubjectVerificationCases('patient', PATIENT_SUBJECT_ACCOUNT_ID, verified ? seedVerifications() : []);
}

/** Test-only: restores the seed state. Never called from application code. */
export function resetPatientStore(): void {
  summary = seedSummary();
  upcomingAppointments = seedUpcomingAppointments();
  activePrescriptions = seedActivePrescriptions();
  profile = seedProfile();
  appointments = seedAppointments();
  medicalRecords = seedMedicalRecords();
  prescriptions = seedPrescriptions();
  healthDashboard = seedHealthDashboard();
  setSubjectVerificationCases('patient', PATIENT_SUBJECT_ACCOUNT_ID, seedVerifications());
}
