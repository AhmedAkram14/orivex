import type { Prescription } from '../entities/prescription.entity.js';

export interface PrescriptionRepository {
  findById(id: string): Promise<Prescription | null>;
  findByConsultationSessionId(consultationSessionId: string): Promise<Prescription[]>;
  save(prescription: Prescription): Promise<void>;
}
