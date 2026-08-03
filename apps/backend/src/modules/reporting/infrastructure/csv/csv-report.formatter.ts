import type { AppointmentAnalyticsResult } from '../../application/ports/appointment-analytics-query.port.js';
import type { DoctorAnalyticsEntry } from '../../application/use-cases/get-doctor-analytics/get-doctor-analytics.use-case.js';
import type { PatientAnalyticsResult } from '../../application/ports/patient-analytics-query.port.js';
import type { PaymentAnalyticsResult } from '../../application/ports/payment-analytics-query.port.js';
import type { TelemedicineAnalyticsResult } from '../../application/ports/telemedicine-analytics-query.port.js';
import type { VerificationAnalyticsResult } from '../../application/ports/verification-analytics-query.port.js';
import type { NotificationAnalyticsResult } from '../../application/ports/notification-analytics-query.port.js';

export type CsvRow = Record<string, string | number>;

// Pure string building, zero dependency -- per the approved "CSV now, Excel/
// PDF later" decision. Escapes only what CSV requires (quote-wrap a field
// containing a comma, quote, or newline; double any embedded quote).
function escapeCsvCell(value: string | number): string {
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsvString(rows: CsvRow[]): string {
  if (rows.length === 0) {
    return '';
  }
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsvCell(row[header])).join(','));
  }
  return lines.join('\n');
}

export function appointmentsToCsvRows(result: AppointmentAnalyticsResult): CsvRow[] {
  return result.byBucket.map((point) => ({ bucket: point.bucket, count: point.count }));
}

export function doctorsToCsvRows(entries: DoctorAnalyticsEntry[]): CsvRow[] {
  return entries.map((entry) => ({
    doctorId: entry.doctorId,
    displayName: entry.displayName,
    completedConsultations: entry.completedConsultations,
    upcomingAppointments: entry.upcomingAppointments,
    cancellationRate: entry.cancellationRate.toFixed(4),
    averageRating: entry.averageRating ?? '',
    reviewCount: entry.reviewCount,
    averageSessionDurationMinutes: entry.averageSessionDurationMinutes ?? '',
    revenueGenerated: entry.revenueGenerated,
    patientCount: entry.patientCount,
  }));
}

export function patientsToCsvRows(result: PatientAnalyticsResult): CsvRow[] {
  return result.mostActivePatients.map((patient) => ({
    patientId: patient.patientId,
    displayName: patient.displayName,
    appointmentCount: patient.appointmentCount,
  }));
}

export function paymentsToCsvRows(result: PaymentAnalyticsResult): CsvRow[] {
  return [
    { metric: 'revenue', value: result.revenue },
    { metric: 'transactions', value: result.transactions },
    { metric: 'successfulPayments', value: result.successfulPayments },
    { metric: 'failedPayments', value: result.failedPayments },
    { metric: 'refunds', value: result.refunds },
    { metric: 'averageConsultationPrice', value: result.averageConsultationPrice ?? '' },
  ];
}

export function telemedicineToCsvRows(result: TelemedicineAnalyticsResult): CsvRow[] {
  return [
    { metric: 'totalSessions', value: result.totalSessions },
    { metric: 'completedSessions', value: result.completedSessions },
    { metric: 'averageDurationMinutes', value: result.averageDurationMinutes ?? '' },
  ];
}

export function verificationToCsvRows(result: VerificationAnalyticsResult): CsvRow[] {
  return [
    { metric: 'pending', value: result.pending },
    { metric: 'approved', value: result.approved },
    { metric: 'rejected', value: result.rejected },
    { metric: 'suspended', value: result.suspended },
    { metric: 'averageReviewTimeHours', value: result.averageReviewTimeHours ?? '' },
    { metric: 'doctorCases', value: result.doctorCases },
    { metric: 'patientCases', value: result.patientCases },
  ];
}

export function notificationsToCsvRows(result: NotificationAnalyticsResult): CsvRow[] {
  return [
    { metric: 'sent', value: result.sent },
    { metric: 'unread', value: result.unread },
    { metric: 'read', value: result.read },
  ];
}
