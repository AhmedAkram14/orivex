import type { ReportFilter } from '../../dto/report-filter.js';
import type { GetAppointmentAnalyticsUseCase } from '../get-appointment-analytics/get-appointment-analytics.use-case.js';
import type { GetDoctorAnalyticsUseCase } from '../get-doctor-analytics/get-doctor-analytics.use-case.js';
import type { GetNotificationAnalyticsUseCase } from '../get-notification-analytics/get-notification-analytics.use-case.js';
import type { GetPatientAnalyticsUseCase } from '../get-patient-analytics/get-patient-analytics.use-case.js';
import type { GetPaymentAnalyticsUseCase } from '../get-payment-analytics/get-payment-analytics.use-case.js';
import type { GetTelemedicineAnalyticsUseCase } from '../get-telemedicine-analytics/get-telemedicine-analytics.use-case.js';
import type { GetVerificationAnalyticsUseCase } from '../get-verification-analytics/get-verification-analytics.use-case.js';
import {
  appointmentsToCsvRows,
  doctorsToCsvRows,
  notificationsToCsvRows,
  patientsToCsvRows,
  paymentsToCsvRows,
  telemedicineToCsvRows,
  toCsvString,
  verificationToCsvRows,
} from '../../../infrastructure/csv/csv-report.formatter.js';

export type ReportSection = 'appointments' | 'doctors' | 'patients' | 'payments' | 'telemedicine' | 'verification' | 'notifications';

export interface ExportReportCsvCommand {
  section: ReportSection;
  filter: ReportFilter;
}

// One use case for every exportable section -- reuses each section's own
// already-built analytics use case rather than re-querying anything;
// csv-report.formatter.ts is a pure string builder with zero dependency, per
// the approved "CSV now, no new package" decision.
export class ExportReportCsvUseCase {
  constructor(
    private readonly getAppointmentAnalyticsUseCase: GetAppointmentAnalyticsUseCase,
    private readonly getDoctorAnalyticsUseCase: GetDoctorAnalyticsUseCase,
    private readonly getPatientAnalyticsUseCase: GetPatientAnalyticsUseCase,
    private readonly getPaymentAnalyticsUseCase: GetPaymentAnalyticsUseCase,
    private readonly getTelemedicineAnalyticsUseCase: GetTelemedicineAnalyticsUseCase,
    private readonly getVerificationAnalyticsUseCase: GetVerificationAnalyticsUseCase,
    private readonly getNotificationAnalyticsUseCase: GetNotificationAnalyticsUseCase,
  ) {}

  async execute(command: ExportReportCsvCommand): Promise<string> {
    switch (command.section) {
      case 'appointments': {
        const result = await this.getAppointmentAnalyticsUseCase.execute(command.filter, 'day');
        return toCsvString(appointmentsToCsvRows(result));
      }
      case 'doctors': {
        const result = await this.getDoctorAnalyticsUseCase.execute(command.filter, {});
        return toCsvString(doctorsToCsvRows(result.entries));
      }
      case 'patients': {
        const result = await this.getPatientAnalyticsUseCase.execute(command.filter);
        return toCsvString(patientsToCsvRows(result));
      }
      case 'payments': {
        const result = await this.getPaymentAnalyticsUseCase.execute(command.filter, false);
        return toCsvString(paymentsToCsvRows(result));
      }
      case 'telemedicine': {
        const result = await this.getTelemedicineAnalyticsUseCase.execute(command.filter);
        return toCsvString(telemedicineToCsvRows(result));
      }
      case 'verification': {
        const result = await this.getVerificationAnalyticsUseCase.execute(command.filter);
        return toCsvString(verificationToCsvRows(result));
      }
      case 'notifications': {
        const result = await this.getNotificationAnalyticsUseCase.execute(command.filter);
        return toCsvString(notificationsToCsvRows(result));
      }
    }
  }
}
