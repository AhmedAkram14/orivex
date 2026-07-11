import type { Prescription } from '../entities/prescription.entity.js';

export interface PrescriptionRepository {
  findById(id: string): Promise<Prescription | null>;
  save(prescription: Prescription): Promise<void>;
}
