import type { MedicalSpecialty } from '../entities/medical-specialty.entity.js';

export interface MedicalSpecialtyRepository {
  findAll(): Promise<MedicalSpecialty[]>;
  findById(id: string): Promise<MedicalSpecialty | null>;
  save(specialty: MedicalSpecialty): Promise<void>;
}
