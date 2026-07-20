import type { Hospital } from '../../../domain/entities/hospital.entity.js';
import type { HospitalRepository } from '../../../domain/repositories/hospital.repository.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// administration.module.ts only.
export class ListHospitalsUseCase {
  constructor(private readonly hospitalRepository: HospitalRepository) {}

  async execute(): Promise<Hospital[]> {
    return this.hospitalRepository.findAll();
  }
}
