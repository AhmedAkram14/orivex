import { createQueryKeyFactory } from '@/shared/lib/api/query-keys';

export const doctorDashboardKeys = createQueryKeyFactory('doctor-dashboard');
export const doctorUpcomingWorkKeys = createQueryKeyFactory('doctor-upcoming-work');
export const doctorProfileKeys = createQueryKeyFactory('doctor-profile');
export const doctorQueueKeys = createQueryKeyFactory('doctor-queue');
// Doctor-approval-workflow fix.
export const doctorPendingApprovalKeys = createQueryKeyFactory('doctor-pending-approval');
// Doctor Onboarding (Phase 4 continuation).
export const doctorHospitalsKeys = createQueryKeyFactory('doctor-hospitals');
export const doctorVerificationsKeys = createQueryKeyFactory('doctor-verifications');
// Onboarding Redesign (2026-07-21 proposal, Stage O.5).
export const doctorDirectoryKeys = createQueryKeyFactory('doctor-directory');
// Onboarding Redesign (2026-07-21 proposal, Stage O.6).
export const doctorDepartmentsKeys = createQueryKeyFactory('doctor-departments');
// Doctor Workspace dashboard redesign.
export const doctorPatientsKeys = createQueryKeyFactory('doctor-patients');
export const doctorReportsSummaryKeys = createQueryKeyFactory('doctor-reports-summary');
