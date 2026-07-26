import { createQueryKeyFactory } from '@/shared/lib/api/query-keys';

export const patientDashboardKeys = createQueryKeyFactory('patient-dashboard');
export const patientUpcomingAppointmentsKeys = createQueryKeyFactory('patient-upcoming-appointments');
export const patientActivePrescriptionsKeys = createQueryKeyFactory('patient-active-prescriptions');
export const patientProfileKeys = createQueryKeyFactory('patient-profile');
export const patientAppointmentsKeys = createQueryKeyFactory('patient-appointments');
export const patientMedicalRecordsKeys = createQueryKeyFactory('patient-medical-records');
export const patientPrescriptionsKeys = createQueryKeyFactory('patient-prescriptions');
export const patientHealthDashboardKeys = createQueryKeyFactory('patient-health-dashboard');
// Onboarding Redesign (2026-07-21 proposal, Stage O.5).
export const patientProfileExistsKeys = createQueryKeyFactory('patient-profile-exists');
// Onboarding Redesign (2026-07-21 proposal, Stage O.7).
export const patientIdentityVerificationStatusKeys = createQueryKeyFactory('patient-identity-verification-status');
export const patientVerificationsKeys = createQueryKeyFactory('patient-verifications');
