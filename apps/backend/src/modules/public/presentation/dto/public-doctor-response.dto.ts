import type { ProfessionalRank } from '../../../doctor/domain/enums/professional-rank.enum.js';
import type { PublicDoctorListing, PublicDoctorListingResult } from '../../application/use-cases/list-public-doctors/list-public-doctors.use-case.js';

export class PublicDoctorResponseDto {
  doctorProfileId!: string;
  fullName!: string;
  professionalRank?: ProfessionalRank;
  specialtyName!: string;
  hospitalId?: string;
  consultationFeeAmount?: number;
  averageRating!: number | null;
  reviewCount!: number;

  static fromDomain(doctor: PublicDoctorListing): PublicDoctorResponseDto {
    const dto = new PublicDoctorResponseDto();
    dto.doctorProfileId = doctor.doctorProfileId;
    dto.fullName = doctor.fullName;
    dto.professionalRank = doctor.professionalRank;
    dto.specialtyName = doctor.specialtyName;
    dto.hospitalId = doctor.hospitalId;
    dto.consultationFeeAmount = doctor.consultationFeeAmount;
    dto.averageRating = doctor.averageRating;
    dto.reviewCount = doctor.reviewCount;
    return dto;
  }
}

export class PublicDoctorListResponseDto {
  doctors!: PublicDoctorResponseDto[];
  total!: number;
  page!: number;
  limit!: number;

  static fromResult(result: PublicDoctorListingResult, page: number, limit: number): PublicDoctorListResponseDto {
    const dto = new PublicDoctorListResponseDto();
    dto.doctors = result.doctors.map((doctor) => PublicDoctorResponseDto.fromDomain(doctor));
    dto.total = result.total;
    dto.page = page;
    dto.limit = limit;
    return dto;
  }
}
