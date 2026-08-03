import type { DoctorAnalyticsResult } from '../../application/use-cases/get-doctor-analytics/get-doctor-analytics.use-case.js';

export class DoctorAnalyticsEntryDto {
  doctorId!: string;
  displayName!: string;
  specialtyId!: string | null;
  completedConsultations!: number;
  upcomingAppointments!: number;
  cancellationRate!: number;
  averageRating!: number | null;
  reviewCount!: number;
  averageSessionDurationMinutes!: number | null;
  revenueGenerated!: number;
  patientCount!: number;
}

export class DoctorAnalyticsResponseDto {
  entries!: DoctorAnalyticsEntryDto[];
  total!: number;

  static fromResult(result: DoctorAnalyticsResult): DoctorAnalyticsResponseDto {
    const dto = new DoctorAnalyticsResponseDto();
    dto.entries = result.entries.map((entry) => Object.assign(new DoctorAnalyticsEntryDto(), entry));
    dto.total = result.total;
    return dto;
  }
}
