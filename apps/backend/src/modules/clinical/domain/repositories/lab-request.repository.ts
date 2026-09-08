import type { LabRequest } from '../entities/lab-request.entity.js';

export interface LabRequestRepository {
  findById(id: string): Promise<LabRequest | null>;
  findByConsultationSessionId(consultationSessionId: string): Promise<LabRequest[]>;
  save(labRequest: LabRequest): Promise<void>;
  update(labRequest: LabRequest): Promise<void>;
}
