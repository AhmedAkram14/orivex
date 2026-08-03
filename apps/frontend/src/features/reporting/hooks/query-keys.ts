import { createQueryKeyFactory } from '@/shared/lib/api/query-keys';

export const dashboardKpisKeys = createQueryKeyFactory('reporting-kpis');
export const appointmentAnalyticsKeys = createQueryKeyFactory('reporting-appointments');
export const doctorAnalyticsKeys = createQueryKeyFactory('reporting-doctors');
export const patientAnalyticsKeys = createQueryKeyFactory('reporting-patients');
export const paymentAnalyticsKeys = createQueryKeyFactory('reporting-payments');
export const telemedicineAnalyticsKeys = createQueryKeyFactory('reporting-telemedicine');
export const verificationAnalyticsKeys = createQueryKeyFactory('reporting-verification');
export const notificationAnalyticsKeys = createQueryKeyFactory('reporting-notifications');
