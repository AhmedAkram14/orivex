import type { LabRequest } from '../../domain/entities/lab-request.entity.js';
import type { LabRequestStatus } from '../../domain/enums/lab-request-status.enum.js';

export class LabRequestResponseDto {
  id!: string;
  consultationSessionId!: string;
  authoringDoctorId!: string;
  testName!: string;
  clinicalReason!: string | null;
  instructions!: string | null;
  status!: LabRequestStatus;
  createdAt!: string;

  static fromDomain(labRequest: LabRequest): LabRequestResponseDto {
    const dto = new LabRequestResponseDto();
    dto.id = labRequest.getId();
    dto.consultationSessionId = labRequest.getConsultationSessionId();
    dto.authoringDoctorId = labRequest.getAuthoringDoctorId();
    dto.testName = labRequest.getTestName();
    dto.clinicalReason = labRequest.getClinicalReason() ?? null;
    dto.instructions = labRequest.getInstructions() ?? null;
    dto.status = labRequest.getStatus();
    dto.createdAt = labRequest.getCreatedAt().toISOString();
    return dto;
  }
}
