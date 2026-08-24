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
import { getDoctorById, getDoctorByAccountId } from '@/mocks/doctor-store';
import { listSpecialties } from '@/mocks/reference-store';
import { getCurrentAccountId, LEGACY_PATIENT_ACCOUNT_ID } from '@/mocks/auth-store';
import { DEMO_SEED_ENABLED } from '@/mocks/demo-mode';
import { DEMO_PATIENTS, type DemoPatient } from '@/mocks/demo-data/demo-people';
import { isAvailabilityWindowBooked, markAvailabilityWindowBooked, resolveWindowPricing } from '@/mocks/scheduling-store';
import {
  findAllVerificationCasesBySubject,
  decideVerificationCase,
  setSubjectVerificationCases,
  submitVerificationCase,
  suspendVerificationCase,
} from '@/mocks/verification-case-store';

/**
 * Demo Data & Profile Avatar Pass -- the root fix for this store's original
 * architectural limitation. Every piece of patient state below used to be a
 * module-level singleton keyed to one hardcoded account id, so switching
 * which mock patient was logged in never changed a thing. Each is now a
 * `Map` keyed by the owning account id, seeded for every demo patient in
 * `demo-people.ts` plus the legacy `patient@orivex.dev` persona.
 *
 * Account resolution order (see `request-account.ts`): the intercepted
 * request's own bearer token -> the mock session marker -> the legacy demo
 * patient. That last fallback is what keeps every existing component test
 * seeing the exact fixture it always did (those tests render a page without
 * ever driving a login, so no token and no session exist).
 */
function resolveAccountId(accountId?: string): string {
  return accountId ?? getCurrentAccountId() ?? LEGACY_PATIENT_ACCOUNT_ID;
}

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
function seedVerifications(subjectAccountId: string = LEGACY_PATIENT_ACCOUNT_ID): AdminVerificationCase[] {
  return [
    {
      id: 'verification-1',
      subjectAccountId,
      subjectType: 'patient',
      status: 'approved',
      submittedAt: '2026-01-01T00:00:00.000Z',
      decidedAt: '2026-01-02T00:00:00.000Z',
      documentAssetIds: ['seed-national-id-front', 'seed-national-id-back', 'seed-selfie-with-id'],
    },
  ];
}

/** A demo patient's `PatientProfile`, built from `demo-people.ts`'s own values. */
function demoPatientProfile(patient: DemoPatient, index: number): PatientProfile {
  const birthYear = new Date().getFullYear() - patient.dateOfBirthYearsAgo;
  return {
    id: `patient-profile-demo-${index + 1}`,
    fullName: patient.displayName,
    email: patient.email,
    phoneNumber: `+20 11${(index + 10).toString().padStart(2, '0')} ${(index + 1).toString().padStart(3, '0')} 7700`,
    avatarUrl: patient.avatarUrl,
    dateOfBirth: `${birthYear}-0${(index % 9) + 1}-1${index % 10}`,
    gender: patient.gender,
    nationalityId: 'country-eg',
    address: `${index + 3} El-Nasr Street, Cairo`,
    bloodType: patient.bloodType as PatientProfile['bloodType'],
    allergies: patient.allergies,
    chronicDiseases: patient.chronicDiseases,
    insuranceProviderId: patient.hasInsurance ? (index % 2 === 0 ? 'insurance-axa' : 'insurance-allianz') : undefined,
    emergencyContacts: [
      {
        id: `contact-demo-${index + 1}`,
        name: patient.emergencyContactName,
        relationship: patient.emergencyContactRelationship,
        phoneNumber: patient.emergencyContactPhone,
      },
    ],
  };
}

function seedProfilesByAccountId(): Map<string, PatientProfile> {
  const seeded = new Map<string, PatientProfile>();
  seeded.set(LEGACY_PATIENT_ACCOUNT_ID, seedProfile());
  if (DEMO_SEED_ENABLED) {
    DEMO_PATIENTS.forEach((patient, index) => seeded.set(patient.accountId, demoPatientProfile(patient, index)));
  }
  return seeded;
}

let profilesByAccountId: Map<string, PatientProfile> = seedProfilesByAccountId();
const summaryByAccountId = new Map<string, PatientDashboardSummary>();
const upcomingAppointmentsByAccountId = new Map<string, UpcomingAppointmentPreview[]>();
const activePrescriptionsByAccountId = new Map<string, ActivePrescriptionPreview[]>();
const appointmentsByAccountId = new Map<string, Appointment[]>();
const medicalRecordsByAccountId = new Map<string, MedicalRecordEntry[]>();
const prescriptionsByAccountId = new Map<string, Prescription[]>();
const healthDashboardByAccountId = new Map<string, HealthVitalSummary[]>();

function seedAllVerifications(): void {
  setSubjectVerificationCases('patient', LEGACY_PATIENT_ACCOUNT_ID, seedVerifications());
  if (!DEMO_SEED_ENABLED) return;
  // Mirrors each demo patient's own `verification` field into the shared
  // verification-case store -- the same cases the admin queue reads.
  for (const patient of DEMO_PATIENTS) {
    if (patient.verification === 'pending') {
      setSubjectVerificationCases('patient', patient.accountId, [
        {
          id: `verification-${patient.accountId}`,
          subjectAccountId: patient.accountId,
          subjectType: 'patient',
          status: 'submitted',
          submittedAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
          decidedAt: null,
          documentAssetIds: ['seed-national-id-front', 'seed-national-id-back', 'seed-selfie-with-id'],
        },
      ]);
      continue;
    }
    const approved = seedVerifications(patient.accountId);
    approved[0].id = `verification-${patient.accountId}`;
    if (patient.verification === 'suspended') {
      approved[0].status = 'suspended';
      approved[0].reason = 'Identity documents flagged for re-verification.';
    }
    setSubjectVerificationCases('patient', patient.accountId, approved);
  }
}

seedAllVerifications();

export function getDashboardSummary(accountId?: string): PatientDashboardSummary {
  return summaryByAccountId.get(resolveAccountId(accountId)) ?? seedSummary();
}

export function getUpcomingAppointments(accountId?: string): UpcomingAppointmentPreview[] {
  return upcomingAppointmentsByAccountId.get(resolveAccountId(accountId)) ?? seedUpcomingAppointments();
}

export function getActivePrescriptions(accountId?: string): ActivePrescriptionPreview[] {
  return activePrescriptionsByAccountId.get(resolveAccountId(accountId)) ?? seedActivePrescriptions();
}

/** `undefined` when the caller's account has no patient profile (e.g. a doctor hitting `/patients/me`) -- the handler maps that to the real backend's own 404. */
export function getProfile(accountId?: string): PatientProfile | undefined {
  return profilesByAccountId.get(resolveAccountId(accountId));
}

/** Backs the public patient-profile page a review links to -- looked up by patientProfileId, not accountId, since that's the id a review carries. */
export function getPatientProfileById(patientProfileId: string): PatientProfile | undefined {
  return [...profilesByAccountId.values()].find((profile) => profile.id === patientProfileId);
}

/** Demo Data & Profile Avatar Pass: lets the cross-store demo seeder give each patient their own dashboard aggregates. */
export function setPatientDashboardState(
  accountId: string,
  state: {
    summary?: PatientDashboardSummary;
    upcomingAppointments?: UpcomingAppointmentPreview[];
    activePrescriptions?: ActivePrescriptionPreview[];
    medicalRecords?: MedicalRecordEntry[];
    prescriptions?: Prescription[];
  },
): void {
  if (state.summary) summaryByAccountId.set(accountId, state.summary);
  if (state.upcomingAppointments) upcomingAppointmentsByAccountId.set(accountId, state.upcomingAppointments);
  if (state.activePrescriptions) activePrescriptionsByAccountId.set(accountId, state.activePrescriptions);
  if (state.medicalRecords) medicalRecordsByAccountId.set(accountId, state.medicalRecords);
  if (state.prescriptions) prescriptionsByAccountId.set(accountId, state.prescriptions);
}

// Onboarding Redesign (2026-07-21 proposal, Stage O.5): the Choose-Your-
// Journey gate's side-effect-free existence check. This mock store always
// has a seeded profile (`seedProfile()` above), so it always reports true --
// matching real production reality for `patient@orivex.dev`, an already-
// onboarded demo account. Component tests that need to exercise the
// "no profile yet" gate override this handler directly via `server.use()`
// (the same pattern `onboarding-flow.test.tsx` already uses for /doctors/me).
export function checkProfileExists(accountId?: string): boolean {
  return profilesByAccountId.has(resolveAccountId(accountId));
}

export function updateProfile(request: PatientProfileUpdateRequest, accountId?: string): PatientProfile | undefined {
  const owner = resolveAccountId(accountId);
  const profile = profilesByAccountId.get(owner);
  if (!profile) return undefined;
  const updated: PatientProfile = {
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
  profilesByAccountId.set(owner, updated);
  return updated;
}

export function getAppointments(accountId?: string): Appointment[] {
  return appointmentsByAccountId.get(resolveAccountId(accountId)) ?? seedAppointments();
}

function setAppointments(owner: string, next: Appointment[]): void {
  appointmentsByAccountId.set(owner, next);
}

/** Demo Data & Profile Avatar Pass: every seeded patient account, for the cross-store demo seeder. */
export function listPatientAccountIds(): string[] {
  return [...profilesByAccountId.keys()];
}

/** Demo Data & Profile Avatar Pass: the cross-store demo seeder's write path for a patient's own appointment history. */
export function setPatientAppointments(accountId: string, next: Appointment[]): void {
  setAppointments(accountId, next);
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
export function seedCompletedAppointment(consultationSessionId: string, doctor: { name: string; specialty: string }, accountId?: string): void {
  const owner = resolveAccountId(accountId);
  setAppointments(owner, [
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
    ...getAppointments(owner),
  ]);
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
export function bookAppointment(request: BookAppointmentRequest, accountId?: string): BookedAppointment {
  const owner = resolveAccountId(accountId);
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
    doctorAvatarUrl: doctor?.avatarUrl,
    specialization: matchedSpecialty?.name ?? '',
    specializationAr: matchedSpecialty?.nameAr ?? null,
    status: 'requested',
    consultationType: pricing.pricingType,
    reasonForVisit: request.reasonForVisit,
    consultationSessionId: null,
    paymentRequired: isPaid,
    feeAmount: isPaid && pricing.feeAmount !== null && pricing.feeCurrency !== null ? { amount: pricing.feeAmount, currency: pricing.feeCurrency } : null,
  };
  setAppointments(owner, [listItem, ...getAppointments(owner)]);

  return {
    id,
    patientId: profilesByAccountId.get(owner)?.id ?? 'patient-profile-1',
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
export function rescheduleAppointment(appointmentId: string, newAvailabilityWindowId: string, accountId?: string): RescheduledAppointment {
  const owner = resolveAccountId(accountId);
  const appointments = getAppointments(owner);
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
    doctorAvatarUrl: doctor?.avatarUrl ?? existing.doctorAvatarUrl,
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
  setAppointments(owner, [listItem, ...appointments]);

  return {
    id: newId,
    patientId: profilesByAccountId.get(owner)?.id ?? 'patient-profile-1',
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
export function cancelAppointment(appointmentId: string, accountId?: string): BookedAppointment {
  const owner = resolveAccountId(accountId);
  const existing = getAppointments(owner).find((entry) => entry.id === appointmentId);
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
    patientId: profilesByAccountId.get(owner)?.id ?? 'patient-profile-1',
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
export function getPendingApprovalAppointments(accountId?: string): {
  id: string;
  patientName: string;
  scheduledAt: string;
  reasonForVisit?: string;
  consultationType: 'free' | 'paid';
}[] {
  // Demo Data & Profile Avatar Pass: this is a *doctor*-facing read, so it
  // now scans every patient's own appointment list and keeps only the ones
  // booked with the calling doctor -- the same doctor-scoped filter the real
  // `DoctorAppointmentsController.getPendingApproval` applies. The patient's
  // name comes from that patient's own profile, never a hardcoded one.
  const doctorAccountId = accountId ?? getCurrentAccountId();
  const doctorProfileId = (doctorAccountId ? getDoctorByAccountId(doctorAccountId) : null)?.id
    ?? getDoctorById('doctor-profile-1')?.id;

  return [...profilesByAccountId.entries()].flatMap(([patientAccountId, patientProfile]) =>
    getAppointments(patientAccountId)
      .filter(
        (appointment) =>
          appointment.status === 'requested' &&
          appointment.consultationType === 'free' &&
          (!doctorProfileId || appointment.doctorId === doctorProfileId),
      )
      .map((appointment) => ({
        id: appointment.id,
        patientName: patientProfile.fullName,
        scheduledAt: appointment.scheduledAt,
        reasonForVisit: appointment.reasonForVisit,
        consultationType: appointment.consultationType,
      })),
  );
}

/** Searches every account's list: an appointment id is looked up by doctors and payment flows too, not just its owning patient. */
function findAppointmentAnywhere(appointmentId: string): Appointment | undefined {
  for (const accountId of profilesByAccountId.keys()) {
    const found = getAppointments(accountId).find((entry) => entry.id === appointmentId);
    if (found) return found;
  }
  return undefined;
}

export function getAppointmentById(appointmentId: string): Appointment | undefined {
  return findAppointmentAnywhere(appointmentId);
}

function confirmAppointment(appointmentId: string): { id: string; status: string } {
  const appointment = findAppointmentAnywhere(appointmentId);
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

export function getMedicalRecords(accountId?: string): MedicalRecordEntry[] {
  return medicalRecordsByAccountId.get(resolveAccountId(accountId)) ?? seedMedicalRecords();
}

export function getPrescriptions(accountId?: string): Prescription[] {
  return prescriptionsByAccountId.get(resolveAccountId(accountId)) ?? seedPrescriptions();
}

export function getHealthDashboard(accountId?: string): HealthVitalSummary[] {
  return healthDashboardByAccountId.get(resolveAccountId(accountId)) ?? seedHealthDashboard();
}

// Onboarding Redesign (2026-07-21 proposal, Stage O.4/O.7). Onboarding
// Redesign integration-gap closure (2026-07-25, Stage O.8): reads from the
// shared `verification-case-store.ts` -- the same case an admin sees.
export function getMyIdentityVerificationStatus(accountId?: string): IdentityVerificationStatus {
  const latest = findAllVerificationCasesBySubject('patient', resolveAccountId(accountId))[0];
  const status = latest?.status ?? 'not_submitted';
  return { status, isVerified: status === 'approved' };
}

export function listMyVerifications(accountId?: string): VerificationCase[] {
  return findAllVerificationCasesBySubject('patient', resolveAccountId(accountId));
}

export function submitMyVerification(request: SubmitPatientVerificationRequest, accountId?: string): VerificationCase {
  return submitVerificationCase({
    subjectAccountId: resolveAccountId(accountId),
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
export function approveMyLatestVerification(accountId?: string): void {
  const latest = findAllVerificationCasesBySubject('patient', resolveAccountId(accountId))[0];
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
export function rejectMyLatestVerification(reason: string, accountId?: string): void {
  const latest = findAllVerificationCasesBySubject('patient', resolveAccountId(accountId))[0];
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
export function suspendMyLatestVerification(reason: string, accountId?: string): void {
  const latest = findAllVerificationCasesBySubject('patient', resolveAccountId(accountId))[0];
  if (!latest) return;
  suspendVerificationCase(latest.id, reason);
}

/**
 * Test-only: flips the seeded account between "already Approved" (the
 * default, matching every other gated-action test's assumption of an
 * already-provisioned demo patient) and "never submitted" (to exercise the
 * gate itself). Never called from application code.
 */
export function setPatientVerified(verified: boolean, accountId?: string): void {
  const owner = resolveAccountId(accountId);
  setSubjectVerificationCases('patient', owner, verified ? seedVerifications(owner) : []);
}

/** Test-only: restores the seed state. Never called from application code. */
export function resetPatientStore(): void {
  const previousAccountIds = [...profilesByAccountId.keys()];
  summaryByAccountId.clear();
  upcomingAppointmentsByAccountId.clear();
  activePrescriptionsByAccountId.clear();
  appointmentsByAccountId.clear();
  medicalRecordsByAccountId.clear();
  prescriptionsByAccountId.clear();
  healthDashboardByAccountId.clear();
  profilesByAccountId = seedProfilesByAccountId();
  for (const accountId of previousAccountIds) {
    setSubjectVerificationCases('patient', accountId, []);
  }
  seedAllVerifications();
}
