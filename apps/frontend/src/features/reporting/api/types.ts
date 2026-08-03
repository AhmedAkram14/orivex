/** Mirrors apps/backend/src/modules/reporting/presentation/dto exactly -- one type per response DTO. */

export interface ReportFilterParams {
  dateFrom?: string;
  dateTo?: string;
  doctorId?: string;
  specialtyId?: string;
  consultationType?: string;
  paymentStatus?: string;
  verificationStatus?: string;
  comparePrevious?: boolean;
}

export interface DashboardKpis {
  totalDoctors: number;
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
}

export interface AppointmentAnalytics {
  totalCount: number;
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
  upcomingCount: number;
  completionRate: number;
  cancellationRate: number;
  noShowRate: number;
  byBucket: Array<{ bucket: string; count: number }>;
  peakHours: Array<{ hour: number; count: number }>;
  peakDays: Array<{ dayOfWeek: number; count: number }>;
  typeDistribution: { free: number; paid: number };
}

export interface DoctorAnalyticsEntry {
  doctorId: string;
  displayName: string;
  specialtyId: string | null;
  completedConsultations: number;
  upcomingAppointments: number;
  cancellationRate: number;
  averageRating: number | null;
  reviewCount: number;
  averageSessionDurationMinutes: number | null;
  revenueGenerated: number;
  patientCount: number;
}

export interface DoctorAnalytics {
  entries: DoctorAnalyticsEntry[];
  total: number;
}

export type DoctorSortBy = 'revenue' | 'rating' | 'completedConsultations' | 'patientCount';

export interface PatientAnalytics {
  newPatients: number;
  returningPatients: number;
  verifiedPatients: number;
  activePatients: number;
  genderDistribution: Record<string, number>;
  ageDistribution: Array<{ bucket: string; count: number }>;
  mostActivePatients: Array<{ patientId: string; displayName: string; appointmentCount: number }>;
}

export interface PaymentAnalytics {
  revenue: number;
  revenueGrowthPercent: number | null;
  transactions: number;
  successfulPayments: number;
  failedPayments: number;
  refunds: number;
  averageConsultationPrice: number | null;
}

export interface TelemedicineAnalytics {
  totalSessions: number;
  completedSessions: number;
  averageDurationMinutes: number | null;
}

export interface VerificationAnalytics {
  pending: number;
  approved: number;
  rejected: number;
  suspended: number;
  averageReviewTimeHours: number | null;
  doctorCases: number;
  patientCases: number;
}

export interface NotificationAnalytics {
  sent: number;
  unread: number;
  read: number;
}

export type ReportSection = 'appointments' | 'doctors' | 'patients' | 'payments' | 'telemedicine' | 'verification' | 'notifications';
