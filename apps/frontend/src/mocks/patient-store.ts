import type {
  ActivePrescriptionPreview,
  PatientDashboardSummary,
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

let summary: PatientDashboardSummary = seedSummary();
let upcomingAppointments: UpcomingAppointmentPreview[] = seedUpcomingAppointments();
let activePrescriptions: ActivePrescriptionPreview[] = seedActivePrescriptions();

export function getDashboardSummary(): PatientDashboardSummary {
  return summary;
}

export function getUpcomingAppointments(): UpcomingAppointmentPreview[] {
  return upcomingAppointments;
}

export function getActivePrescriptions(): ActivePrescriptionPreview[] {
  return activePrescriptions;
}

/** Test-only: restores the seed state. Never called from application code. */
export function resetPatientStore(): void {
  summary = seedSummary();
  upcomingAppointments = seedUpcomingAppointments();
  activePrescriptions = seedActivePrescriptions();
}
