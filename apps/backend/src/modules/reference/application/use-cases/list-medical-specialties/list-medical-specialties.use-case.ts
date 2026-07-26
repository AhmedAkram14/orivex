import type { MedicalSpecialty } from '../../../domain/entities/medical-specialty.entity.js';
import type { MedicalSpecialtyRepository } from '../../../domain/repositories/medical-specialty.repository.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// reference.module.ts only.
export class ListMedicalSpecialtiesUseCase {
  constructor(private readonly medicalSpecialtyRepository: MedicalSpecialtyRepository) {}

  async execute(): Promise<MedicalSpecialty[]> {
    return this.medicalSpecialtyRepository.findAll();
  }
}
