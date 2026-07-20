import { Hospital } from '../../../domain/entities/hospital.entity.js';
import type { HospitalRepository } from '../../../domain/repositories/hospital.repository.js';

import type { CreateHospitalCommand } from './create-hospital.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// administration.module.ts only.
export class CreateHospitalUseCase {
  constructor(private readonly hospitalRepository: HospitalRepository) {}

  async execute(command: CreateHospitalCommand): Promise<Hospital> {
    const hospital = Hospital.create({ name: command.name, address: command.address });
    await this.hospitalRepository.save(hospital);
    return hospital;
  }
}
