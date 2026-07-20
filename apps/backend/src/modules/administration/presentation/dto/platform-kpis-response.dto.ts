import type { GetPlatformKpisResult } from '../../application/use-cases/get-platform-kpis/get-platform-kpis.result.js';

// Deliberately only identity-owned counts this stage -- see
// GetPlatformKpisUseCase's own comment for why appointment volume/revenue
// KPIs are deferred to Stage 9 (Reporting & Analytics).
export class PlatformKpisResponseDto {
  activeDoctorCount!: number;
  activePatientCount!: number;
  hospitalCount!: number;

  static fromResult(result: GetPlatformKpisResult): PlatformKpisResponseDto {
    const dto = new PlatformKpisResponseDto();
    dto.activeDoctorCount = result.activeDoctorCount;
    dto.activePatientCount = result.activePatientCount;
    dto.hospitalCount = result.hospitalCount;
    return dto;
  }
}
