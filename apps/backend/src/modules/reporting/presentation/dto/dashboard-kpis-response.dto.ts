import type { DashboardKpisResult } from '../../application/use-cases/get-dashboard-kpis/get-dashboard-kpis.use-case.js';

export class DashboardKpisResponseDto {
  totalDoctors!: number;
  verifiedDoctors!: number;
  pendingVerification!: number;
  totalPatients!: number;
  activePatients!: number;
  totalAppointments!: number;
  completedAppointments!: number;
  cancelledAppointments!: number;
  upcomingAppointments!: number;
  videoConsultations!: number;
  payments!: number;
  revenue!: number;
  averageConsultationDurationMinutes!: number | null;
  averageRating!: number | null;

  static fromResult(result: DashboardKpisResult): DashboardKpisResponseDto {
    return Object.assign(new DashboardKpisResponseDto(), result);
  }
}
