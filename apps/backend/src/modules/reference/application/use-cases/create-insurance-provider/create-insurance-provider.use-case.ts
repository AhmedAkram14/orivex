import { InsuranceProvider } from '../../../domain/entities/insurance-provider.entity.js';
import type { InsuranceProviderRepository } from '../../../domain/repositories/insurance-provider.repository.js';

import type { CreateInsuranceProviderCommand } from './create-insurance-provider.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// reference.module.ts only.
export class CreateInsuranceProviderUseCase {
  constructor(private readonly insuranceProviderRepository: InsuranceProviderRepository) {}

  async execute(command: CreateInsuranceProviderCommand): Promise<InsuranceProvider> {
    const provider = InsuranceProvider.create({ name: command.name });
    await this.insuranceProviderRepository.save(provider);
    return provider;
  }
}
