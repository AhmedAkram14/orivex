import type { Prescription } from '../entities/prescription.entity.js';

export interface PrescriptionRepository {
  findById(id: string): Promise<Prescription | null>;
  findByConsultationSessionId(consultationSessionId: string): Promise<Prescription[]>;
  /** I12 -- Prescription digital signature: the public verification lookup. */
  findByVerificationCode(verificationCode: string): Promise<Prescription | null>;
  save(prescription: Prescription): Promise<void>;
}
