import type { DoctorFollow } from '../../domain/entities/doctor-follow.entity.js';

export class DoctorFollowResponseDto {
  id!: string;
  doctorId!: string;
  createdAt!: string;

  static fromDomain(follow: DoctorFollow): DoctorFollowResponseDto {
    const dto = new DoctorFollowResponseDto();
    dto.id = follow.getId();
    dto.doctorId = follow.getDoctorId();
    dto.createdAt = follow.getCreatedAt().toISOString();
    return dto;
  }
}
