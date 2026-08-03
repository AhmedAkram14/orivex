import type { PatientAnalyticsResult } from '../../application/ports/patient-analytics-query.port.js';

export class PatientAnalyticsResponseDto {
  newPatients!: number;
  returningPatients!: number;
  verifiedPatients!: number;
  activePatients!: number;
  genderDistribution!: Record<string, number>;
  ageDistribution!: Array<{ bucket: string; count: number }>;
  mostActivePatients!: Array<{ patientId: string; displayName: string; appointmentCount: number }>;

  static fromResult(result: PatientAnalyticsResult): PatientAnalyticsResponseDto {
    return Object.assign(new PatientAnalyticsResponseDto(), result);
  }
}
