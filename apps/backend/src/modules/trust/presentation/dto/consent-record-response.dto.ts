import type { ConsentRecord } from '../../domain/entities/consent-record.entity.js';
import type { ConsentState } from '../../domain/enums/consent-state.enum.js';

// Matches docs/12-openapi.md's ConsentRecord schema exactly: scopeCategory
// is the stable code string (e.g. "general"), not the row id -- the
// controller resolves it once and passes it in, since ConsentRecord itself
// only stores scopeCategoryId.
export class ConsentRecordResponseDto {
  id!: string;
  patientId!: string;
  doctorId!: string;
  scopeCategory!: string;
  state!: ConsentState;
  versionNumber!: number;
  effectiveAt!: string;

  static fromDomain(record: ConsentRecord, scopeCategoryCode: string): ConsentRecordResponseDto {
    const dto = new ConsentRecordResponseDto();
    dto.id = record.getId();
    dto.patientId = record.getPatientId();
    dto.doctorId = record.getDoctorId();
    dto.scopeCategory = scopeCategoryCode;
    dto.state = record.getState();
    dto.versionNumber = record.getVersionNumber();
    dto.effectiveAt = record.getEffectiveAt().toISOString();
    return dto;
  }
}
