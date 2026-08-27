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
// Doctor-facing Patient Chart (protected).
export const doctorPatientChartProfileKeys = createQueryKeyFactory('doctor-patient-chart-profile');
export const doctorPatientChartAppointmentsKeys = createQueryKeyFactory('doctor-patient-chart-appointments');
export const doctorPatientChartMedicalRecordsKeys = createQueryKeyFactory('doctor-patient-chart-medical-records');
export const doctorPatientChartPrescriptionsKeys = createQueryKeyFactory('doctor-patient-chart-prescriptions');
export const doctorPatientChartDocumentsKeys = createQueryKeyFactory('doctor-patient-chart-documents');
