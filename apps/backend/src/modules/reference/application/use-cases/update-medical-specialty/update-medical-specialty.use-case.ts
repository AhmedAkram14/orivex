import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { MedicalSpecialty } from '../../../domain/entities/medical-specialty.entity.js';
import type { MedicalSpecialtyRepository } from '../../../domain/repositories/medical-specialty.repository.js';

import type { UpdateMedicalSpecialtyCommand } from './update-medical-specialty.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// reference.module.ts only.
export class UpdateMedicalSpecialtyUseCase {
  constructor(private readonly medicalSpecialtyRepository: MedicalSpecialtyRepository) {}

  async execute(command: UpdateMedicalSpecialtyCommand): Promise<MedicalSpecialty> {
    const specialty = await this.medicalSpecialtyRepository.findById(command.medicalSpecialtyId);
    if (!specialty) {
      throw new NotFoundError(`Medical specialty "${command.medicalSpecialtyId}" not found.`);
    }

    specialty.update({ name: command.name, nameAr: command.nameAr, isActive: command.isActive });
    await this.medicalSpecialtyRepository.save(specialty);

    return specialty;
  }
}
