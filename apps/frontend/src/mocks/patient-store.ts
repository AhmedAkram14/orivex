import type {
  ActivePrescriptionPreview,
  Appointment,
  HealthVitalSummary,
  MedicalRecordEntry,
  PatientDashboardSummary,
  PatientProfile,
  PatientProfileUpdateRequest,
  Prescription,
  UpcomingAppointmentPreview,
} from '@/features/patient/api/types';

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
    emergencyContacts: [
      { id: 'contact-1', name: 'Mona Youssef', relationship: 'Sister', phoneNumber: '+20 100 333 4444' },
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
 * The Medical Records timeline (milestone 4) — an honest empty array, same
 * reasoning as `seedAppointments`: no Clinical module is wired into the
 * frontend yet. `downloadUrl` never gets a fabricated value on any seeded
 * entry (there is none to seed yet), keeping `RecordDownloadButton`
 * architecture-ready but never rendered on fake data.
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

let summary: PatientDashboardSummary = seedSummary();
let upcomingAppointments: UpcomingAppointmentPreview[] = seedUpcomingAppointments();
let activePrescriptions: ActivePrescriptionPreview[] = seedActivePrescriptions();
let profile: PatientProfile = seedProfile();
let appointments: Appointment[] = seedAppointments();
let medicalRecords: MedicalRecordEntry[] = seedMedicalRecords();
let prescriptions: Prescription[] = seedPrescriptions();
let healthDashboard: HealthVitalSummary[] = seedHealthDashboard();

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

export function updateProfile(request: PatientProfileUpdateRequest): PatientProfile {
  profile = {
    ...profile,
    dateOfBirth: request.dateOfBirth ?? profile.dateOfBirth,
    emergencyContacts: request.emergencyContacts.map((contact, index) => ({
      id: contact.id ?? `contact-${Date.now()}-${index}`,
      name: contact.name,
      relationship: contact.relationship,
      phoneNumber: contact.phoneNumber,
    })),
  };
  return profile;
}

export function getAppointments(): Appointment[] {
  return appointments;
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
}
