import type { DoctorDirectoryEntry, DoctorDirectoryResult } from '../../application/ports/doctor-directory-query.port.js';

export class DoctorDirectoryEntryResponseDto {
  doctorProfileId!: string;
  accountId!: string;
  displayName!: string;
  specialtyId!: string;
  yearsOfExperience?: number;
  consultationFeeAmount?: number;
  hospitalId?: string;
  avatarUrl?: string;

  static fromEntry(entry: DoctorDirectoryEntry): DoctorDirectoryEntryResponseDto {
    const dto = new DoctorDirectoryEntryResponseDto();
    dto.doctorProfileId = entry.doctorProfileId;
    dto.accountId = entry.accountId;
    dto.displayName = entry.displayName;
    dto.specialtyId = entry.specialtyId;
    dto.yearsOfExperience = entry.yearsOfExperience;
    dto.consultationFeeAmount = entry.consultationFeeAmount;
    dto.hospitalId = entry.hospitalId;
    dto.avatarUrl = entry.avatarUrl;
    return dto;
  }
}

export class DoctorDirectoryResponseDto {
  doctors!: DoctorDirectoryEntryResponseDto[];
  total!: number;
  page!: number;
  limit!: number;

  static fromResult(result: DoctorDirectoryResult, page: number, limit: number): DoctorDirectoryResponseDto {
    const dto = new DoctorDirectoryResponseDto();
    dto.doctors = result.entries.map((entry) => DoctorDirectoryEntryResponseDto.fromEntry(entry));
    dto.total = result.total;
    dto.page = page;
    dto.limit = limit;
    return dto;
  }
}
