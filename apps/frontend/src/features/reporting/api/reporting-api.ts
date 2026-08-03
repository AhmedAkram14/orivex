import { apiFetch } from '@/shared/lib/api/client';
import { env } from '@/shared/lib/env';
import { REPORTING_PATHS } from '@/features/reporting/api/paths';
import type {
  AppointmentAnalytics,
  DashboardKpis,
  DoctorAnalytics,
  DoctorSortBy,
  NotificationAnalytics,
  PatientAnalytics,
  PaymentAnalytics,
  ReportFilterParams,
  ReportSection,
  TelemedicineAnalytics,
  VerificationAnalytics,
} from '@/features/reporting/api/types';

function buildQuery<T extends object>(params: T = {} as T): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  }
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

/** The only module that talks to `/admin/analytics/*` -- mirrors `adminApi`'s shape exactly (ReportingModule's ReportingController). */
export const reportingApi = {
  getKpis: (filter: ReportFilterParams = {}) => apiFetch<DashboardKpis>({ path: `${REPORTING_PATHS.kpis}${buildQuery(filter)}` }),

  getAppointmentAnalytics: (filter: ReportFilterParams & { bucket?: string } = {}) =>
    apiFetch<AppointmentAnalytics>({ path: `${REPORTING_PATHS.appointments}${buildQuery(filter)}` }),

  getDoctorAnalytics: (filter: ReportFilterParams & { sortBy?: DoctorSortBy; limit?: number } = {}) =>
    apiFetch<DoctorAnalytics>({ path: `${REPORTING_PATHS.doctors}${buildQuery(filter)}` }),

  getPatientAnalytics: (filter: ReportFilterParams = {}) =>
    apiFetch<PatientAnalytics>({ path: `${REPORTING_PATHS.patients}${buildQuery(filter)}` }),

  getPaymentAnalytics: (filter: ReportFilterParams = {}) =>
    apiFetch<PaymentAnalytics>({ path: `${REPORTING_PATHS.payments}${buildQuery(filter)}` }),

  getTelemedicineAnalytics: (filter: ReportFilterParams = {}) =>
    apiFetch<TelemedicineAnalytics>({ path: `${REPORTING_PATHS.telemedicine}${buildQuery(filter)}` }),

  getVerificationAnalytics: (filter: ReportFilterParams = {}) =>
    apiFetch<VerificationAnalytics>({ path: `${REPORTING_PATHS.verification}${buildQuery(filter)}` }),

  getNotificationAnalytics: (filter: ReportFilterParams = {}) =>
    apiFetch<NotificationAnalytics>({ path: `${REPORTING_PATHS.notifications}${buildQuery(filter)}` }),

  /**
   * Not routed through `apiFetch` -- the export endpoint returns a raw CSV
   * body, not the `{ data, meta }` envelope `apiFetch` unwraps. Returns the
   * absolute URL for a real browser `<a download>` (auth cookie travels with
   * it); actual fetching for the blob-download flow happens in
   * `use-export-report.ts`, which needs the bearer header `apiFetch` already
   * knows how to attach.
   */
  buildExportUrl: (section: ReportSection, filter: ReportFilterParams = {}) =>
    `${env.apiBaseUrl}${REPORTING_PATHS.export}${buildQuery({ ...filter, report: section })}`,
};
