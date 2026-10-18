import { overviewWindows } from '../../dto/operating-day.js';
import { DEFAULT_WINDOW_DAYS, resolveCurrentWindow } from '../../dto/previous-period.js';
import type { AdminQueueQueryPort, WorkQueueSnapshot } from '../../ports/admin-queue-query.port.js';
import type { AppointmentAnalyticsQueryPort } from '../../ports/appointment-analytics-query.port.js';
import type { DoctorAnalyticsQueryPort } from '../../ports/doctor-analytics-query.port.js';
import type { PatientAnalyticsQueryPort } from '../../ports/patient-analytics-query.port.js';
import type { PaymentAnalyticsQueryPort } from '../../ports/payment-analytics-query.port.js';
import type { VerificationAnalyticsQueryPort } from '../../ports/verification-analytics-query.port.js';

export interface AdminOverviewResult {
  generatedAt: Date;
  needsAttention: {
    pendingVerifications: WorkQueueSnapshot;
    openDisputes: WorkQueueSnapshot;
    flaggedReviews: WorkQueueSnapshot;
  };
  /** Average hours from submission to decision, every decided case -- Analytics' "average review time". */
  averageVerificationReviewHours: number | null;
  health: {
    appointmentsToday: number;
    appointmentsLast7Days: number;
    /** All time, every appointment -- Analytics' appointment rates with no filter. */
    completionRate: number;
    cancellationRate: number;
    noShowRate: number;
    revenueToday: number;
    /** Today so far against the same stretch of the same weekday last week; null when that baseline had no revenue. */
    revenueChangePercent: number | null;
    /** Trailing 30 days -- Analytics' "Failed" payments with no filter. */
    failedPayments: number;
    activeDoctors: number;
    activePatients: number;
    activeWindowDays: number;
  };
}

/**
 * The admin Overview's one aggregate read (GET /admin/overview): what needs
 * an admin's attention now, and a compact platform-health strip. Every
 * health figure comes from the same query port, with the same window, that
 * the Analytics dashboard uses for the same figure, so the two pages can't
 * disagree; the work-queue counts are scoped exactly like the queue pages
 * the Overview links to. Read-only throughout.
 */
export class GetAdminOverviewUseCase {
  constructor(
    private readonly adminQueueQuery: AdminQueueQueryPort,
    private readonly verificationAnalyticsQuery: VerificationAnalyticsQueryPort,
    private readonly appointmentAnalyticsQuery: AppointmentAnalyticsQueryPort,
    private readonly paymentAnalyticsQuery: PaymentAnalyticsQueryPort,
    private readonly patientAnalyticsQuery: PatientAnalyticsQueryPort,
    private readonly doctorAnalyticsQuery: DoctorAnalyticsQueryPort,
  ) {}

  async execute(now: Date = new Date()): Promise<AdminOverviewResult> {
    const windows = overviewWindows(now);
    const activeWindow = resolveCurrentWindow(undefined, now);

    const [
      pendingVerifications,
      openDisputes,
      flaggedReviews,
      verification,
      appointmentsToday,
      appointmentsLast7Days,
      appointmentsAllTime,
      revenueToday,
      paymentsLast30Days,
      activePatients,
      activeDoctors,
    ] = await Promise.all([
      this.adminQueueQuery.getPendingVerifications(),
      this.adminQueueQuery.getOpenDisputes(),
      this.adminQueueQuery.getFlaggedReviews(),
      this.verificationAnalyticsQuery.getAnalytics({}),
      this.appointmentAnalyticsQuery.getAnalytics({ dateFrom: windows.today.from, dateTo: windows.today.to }, 'day'),
      this.appointmentAnalyticsQuery.getAnalytics({ dateFrom: windows.last7Days.from, dateTo: windows.last7Days.to }, 'day'),
      this.appointmentAnalyticsQuery.getAnalytics({}, 'day'),
      this.paymentAnalyticsQuery.getAnalytics({}, windows.todaySoFar, windows.sameTimeLastWeek),
      this.paymentAnalyticsQuery.getAnalytics({}, activeWindow),
      this.patientAnalyticsQuery.countActivePatients(activeWindow),
      this.doctorAnalyticsQuery.countActiveDoctors(activeWindow),
    ]);

    return {
      generatedAt: now,
      needsAttention: { pendingVerifications, openDisputes, flaggedReviews },
      averageVerificationReviewHours: verification.averageReviewTimeHours,
      health: {
        appointmentsToday: appointmentsToday.totalCount,
        appointmentsLast7Days: appointmentsLast7Days.totalCount,
        completionRate: appointmentsAllTime.completionRate,
        cancellationRate: appointmentsAllTime.cancellationRate,
        noShowRate: appointmentsAllTime.noShowRate,
        revenueToday: revenueToday.revenue,
        revenueChangePercent: revenueToday.revenueGrowthPercent,
        failedPayments: paymentsLast30Days.failedPayments,
        activeDoctors,
        activePatients,
        // resolveCurrentWindow's default -- the window Analytics uses with no date filter.
        activeWindowDays: DEFAULT_WINDOW_DAYS,
      },
    };
  }
}
