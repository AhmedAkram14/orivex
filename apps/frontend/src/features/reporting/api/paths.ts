/** Path constants for `/admin/analytics/*` -- real backend routes (ReportingModule's ReportingController). */
export const REPORTING_PATHS = {
  kpis: '/admin/analytics/kpis',
  appointments: '/admin/analytics/appointments',
  doctors: '/admin/analytics/doctors',
  patients: '/admin/analytics/patients',
  payments: '/admin/analytics/payments',
  telemedicine: '/admin/analytics/telemedicine',
  verification: '/admin/analytics/verification',
  notifications: '/admin/analytics/notifications',
  export: '/admin/analytics/export',
} as const;
