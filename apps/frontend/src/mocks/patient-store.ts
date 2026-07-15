import type {
  ActivePrescriptionPreview,
  PatientDashboardSummary,
  PatientProfile,
  PatientProfileUpdateRequest,
  UpcomingAppointmentPreview,
} from '@/features/patient/api/types';

/**
 * In-memory mock "backend" state for `/patient/*` — mirrors
 * `doctor-store.ts`'s pattern. Deliberately an honest zero/empty reality: no
 * Scheduling/Clinical module is wired into the frontend yet (this phase's
 * explicit scope), so the summary counts and preview lists reflect "nothing
 * yet," never invented clinical data.
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
 * `patient@orivex.dev` / "Amina Youssef" mock account for continuity.
 * `medicalInfo` stays an honest "not on record" empty state, though — it's
 * clinical data that would come from `ClinicalModule`, never fabricated.
 */
function seedProfile(): PatientProfile {
  return {
    id: 'patient-profile-1',
    fullName: 'Amina Youssef',
    dateOfBirth: '1990-04-12',
    gender: 'female',
    email: 'patient@orivex.dev',
    phone: '+20 100 111 2222',
    address: '14 Al Nasr Road, Cairo, Egypt',
    medicalInfo: {
      bloodType: undefined,
      allergies: [],
      chronicConditions: [],
    },
    emergencyContacts: [
      { id: 'contact-1', name: 'Mona Youssef', relationship: 'Sister', phone: '+20 100 333 4444' },
    ],
  };
}

let summary: PatientDashboardSummary = seedSummary();
let upcomingAppointments: UpcomingAppointmentPreview[] = seedUpcomingAppointments();
let activePrescriptions: ActivePrescriptionPreview[] = seedActivePrescriptions();
let profile: PatientProfile = seedProfile();

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
    phone: request.phone,
    address: request.address,
    emergencyContacts: request.emergencyContacts.map((contact, index) => ({
      id: contact.id ?? `contact-${Date.now()}-${index}`,
      name: contact.name,
      relationship: contact.relationship,
      phone: contact.phone,
    })),
  };
  return profile;
}

/** Test-only: restores the seed state. Never called from application code. */
export function resetPatientStore(): void {
  summary = seedSummary();
  upcomingAppointments = seedUpcomingAppointments();
  activePrescriptions = seedActivePrescriptions();
  profile = seedProfile();
}
