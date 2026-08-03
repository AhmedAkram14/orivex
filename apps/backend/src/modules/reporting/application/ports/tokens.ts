// NestJS DI injection tokens for this module's own read-only query ports.
// ReportingModule owns no aggregates and no write-repos — these are purely
// query-side (CQRS read model) ports, one per analytics section.
export const APPOINTMENT_ANALYTICS_QUERY = Symbol('AppointmentAnalyticsQueryPort');
export const DOCTOR_ANALYTICS_QUERY = Symbol('DoctorAnalyticsQueryPort');
export const PATIENT_ANALYTICS_QUERY = Symbol('PatientAnalyticsQueryPort');
export const PAYMENT_ANALYTICS_QUERY = Symbol('PaymentAnalyticsQueryPort');
export const TELEMEDICINE_ANALYTICS_QUERY = Symbol('TelemedicineAnalyticsQueryPort');
export const VERIFICATION_ANALYTICS_QUERY = Symbol('VerificationAnalyticsQueryPort');
export const NOTIFICATION_ANALYTICS_QUERY = Symbol('NotificationAnalyticsQueryPort');
