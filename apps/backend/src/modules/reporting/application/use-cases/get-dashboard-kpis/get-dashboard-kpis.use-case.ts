import { AccountRole } from '../../../../identity/domain/enums/account-role.enum.js';
import { ListAccountsQuery } from '../../../../identity/application/use-cases/list-accounts/list-accounts.query.js';
import type { ListAccountsUseCase } from '../../../../identity/application/use-cases/list-accounts/list-accounts.use-case.js';
import type { ReportFilter } from '../../dto/report-filter.js';
import type { AppointmentAnalyticsQueryPort } from '../../ports/appointment-analytics-query.port.js';
import type { DoctorAnalyticsQueryPort } from '../../ports/doctor-analytics-query.port.js';
import type { PatientAnalyticsQueryPort } from '../../ports/patient-analytics-query.port.js';
import type { PaymentAnalyticsQueryPort } from '../../ports/payment-analytics-query.port.js';
import type { TelemedicineAnalyticsQueryPort } from '../../ports/telemedicine-analytics-query.port.js';
import type { VerificationAnalyticsQueryPort } from '../../ports/verification-analytics-query.port.js';
import { resolveCurrentWindow } from '../../dto/previous-period.js';
import type { GetDoctorAnalyticsUseCase } from '../get-doctor-analytics/get-doctor-analytics.use-case.js';

export interface DashboardKpisResult {
  totalDoctors: number;
  /** Distinct doctors with a COMPLETED appointment in the window -- the same "active" as activePatients. */
  activeDoctors: number;
  verifiedDoctors: number;
  pendingVerification: number;
  totalPatients: number;
  activePatients: number;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  upcomingAppointments: number;
  videoConsultations: number;
  payments: number;
  revenue: number;
  averageConsultationDurationMinutes: number | null;
  averageRating: number | null;
  // Average Response Time is deliberately absent -- no column models a
  // doctor's accept/response latency on an Appointment request anywhere in
  // the schema. Faking it would misrepresent real operational data.
}

// The Analytics dashboard's tile row -- composes every other analytics
// query rather than re-querying anything itself (this module's own
// no-duplication rule). "Total doctors/patients" are ListAccountsUseCase's
// role counts; "Active doctors/patients" are the completed-visit counts
// (PatientAnalyticsQueryPort / DoctorAnalyticsQueryPort), the same figures
// GetAdminOverviewUseCase shows on the admin Overview.
export class GetDashboardKpisUseCase {
  constructor(
    private readonly listAccountsUseCase: ListAccountsUseCase,
    private readonly verificationAnalyticsQuery: VerificationAnalyticsQueryPort,
    private readonly appointmentAnalyticsQuery: AppointmentAnalyticsQueryPort,
    private readonly telemedicineAnalyticsQuery: TelemedicineAnalyticsQueryPort,
    private readonly paymentAnalyticsQuery: PaymentAnalyticsQueryPort,
    private readonly patientAnalyticsQuery: PatientAnalyticsQueryPort,
    private readonly getDoctorAnalyticsUseCase: GetDoctorAnalyticsUseCase,
    private readonly doctorAnalyticsQuery: DoctorAnalyticsQueryPort,
  ) {}

  async execute(filter: ReportFilter): Promise<DashboardKpisResult> {
    const window = resolveCurrentWindow(filter.dateFrom, filter.dateTo);

    const [doctors, patients, verification, appointments, telemedicine, payments, patientAnalytics, doctorAnalytics, activeDoctors] =
      await Promise.all([
        this.listAccountsUseCase.execute(new ListAccountsQuery({ page: 1, limit: 1, role: AccountRole.Doctor })),
        this.listAccountsUseCase.execute(new ListAccountsQuery({ page: 1, limit: 1, role: AccountRole.Patient })),
        this.verificationAnalyticsQuery.getAnalytics(filter),
        this.appointmentAnalyticsQuery.getAnalytics(filter, 'day'),
        this.telemedicineAnalyticsQuery.getAnalytics(filter),
        this.paymentAnalyticsQuery.getAnalytics(filter, window),
        this.patientAnalyticsQuery.getAnalytics(filter),
        this.getDoctorAnalyticsUseCase.execute(filter, {}),
        // The same window patientAnalytics resolves for activePatients.
        this.doctorAnalyticsQuery.countActiveDoctors(window),
      ]);

    const ratedDoctors = doctorAnalytics.entries.filter((entry) => entry.reviewCount > 0);
    const totalReviews = ratedDoctors.reduce((sum, entry) => sum + entry.reviewCount, 0);
    const averageRating =
      totalReviews > 0
        ? ratedDoctors.reduce((sum, entry) => sum + (entry.averageRating ?? 0) * entry.reviewCount, 0) / totalReviews
        : null;

    return {
      totalDoctors: doctors.total,
      activeDoctors,
      verifiedDoctors: verification.approvedDoctors,
      pendingVerification: verification.pending,
      totalPatients: patients.total,
      activePatients: patientAnalytics.activePatients,
      totalAppointments: appointments.totalCount,
      completedAppointments: appointments.completedCount,
      cancelledAppointments: appointments.cancelledCount,
      upcomingAppointments: appointments.upcomingCount,
      videoConsultations: telemedicine.totalSessions,
      payments: payments.transactions,
      revenue: payments.revenue,
      averageConsultationDurationMinutes: telemedicine.averageDurationMinutes,
      averageRating,
    };
  }
}
