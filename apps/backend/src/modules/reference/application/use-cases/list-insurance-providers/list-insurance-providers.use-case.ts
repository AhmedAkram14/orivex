import type { InsuranceProvider } from '../../../domain/entities/insurance-provider.entity.js';
import type { InsuranceProviderRepository } from '../../../domain/repositories/insurance-provider.repository.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// reference.module.ts only.
export class ListInsuranceProvidersUseCase {
  constructor(private readonly insuranceProviderRepository: InsuranceProviderRepository) {}

  async execute(): Promise<InsuranceProvider[]> {
    return this.insuranceProviderRepository.findAll();
  }
}
