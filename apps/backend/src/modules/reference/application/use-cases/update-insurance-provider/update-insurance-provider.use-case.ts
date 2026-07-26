import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { InsuranceProvider } from '../../../domain/entities/insurance-provider.entity.js';
import type { InsuranceProviderRepository } from '../../../domain/repositories/insurance-provider.repository.js';

import type { UpdateInsuranceProviderCommand } from './update-insurance-provider.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// reference.module.ts only.
export class UpdateInsuranceProviderUseCase {
  constructor(private readonly insuranceProviderRepository: InsuranceProviderRepository) {}

  async execute(command: UpdateInsuranceProviderCommand): Promise<InsuranceProvider> {
    const provider = await this.insuranceProviderRepository.findById(command.insuranceProviderId);
    if (!provider) {
      throw new NotFoundError(`Insurance provider "${command.insuranceProviderId}" not found.`);
    }

    provider.update({ name: command.name, isActive: command.isActive });
    await this.insuranceProviderRepository.save(provider);

    return provider;
  }
}
