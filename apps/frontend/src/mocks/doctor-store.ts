import type { DoctorDashboardSummary, UpcomingWorkItem } from '@/features/doctor/api/types';

/**
 * In-memory mock "backend" state for `/doctor/*` — mirrors
 * `notifications-store.ts`'s pattern. Deliberately an honest zero/empty
 * reality: no Appointment/Consultation module exists yet (this phase's
 * explicit scope), so the summary counts and upcoming-work list reflect
 * "nothing scheduled yet," never invented clinical data.
 */
function seedSummary(): DoctorDashboardSummary {
  return { consultationsToday: 0, patientsInQueue: 0, completedToday: 0 };
}

function seedUpcomingWork(): UpcomingWorkItem[] {
  return [];
}

let summary: DoctorDashboardSummary = seedSummary();
let upcomingWork: UpcomingWorkItem[] = seedUpcomingWork();

export function getDashboardSummary(): DoctorDashboardSummary {
  return summary;
}

export function getUpcomingWork(): UpcomingWorkItem[] {
  return upcomingWork;
}

/** Test-only: restores the seed (empty) state. Never called from application code. */
export function resetDoctorStore(): void {
  summary = seedSummary();
  upcomingWork = seedUpcomingWork();
}
