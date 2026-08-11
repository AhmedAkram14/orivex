import { MedicalSpecialty } from '../../../domain/entities/medical-specialty.entity.js';
import type { MedicalSpecialtyRepository } from '../../../domain/repositories/medical-specialty.repository.js';

import type { CreateMedicalSpecialtyCommand } from './create-medical-specialty.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// reference.module.ts only.
export class CreateMedicalSpecialtyUseCase {
  constructor(private readonly medicalSpecialtyRepository: MedicalSpecialtyRepository) {}

  async execute(command: CreateMedicalSpecialtyCommand): Promise<MedicalSpecialty> {
    const specialty = MedicalSpecialty.create({ name: command.name, nameAr: command.nameAr });
    await this.medicalSpecialtyRepository.save(specialty);
    return specialty;
  }
}
