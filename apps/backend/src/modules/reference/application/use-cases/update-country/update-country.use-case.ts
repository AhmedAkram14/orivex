import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { Country } from '../../../domain/entities/country.entity.js';
import type { CountryRepository } from '../../../domain/repositories/country.repository.js';

import type { UpdateCountryCommand } from './update-country.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// reference.module.ts only.
export class UpdateCountryUseCase {
  constructor(private readonly countryRepository: CountryRepository) {}

  async execute(command: UpdateCountryCommand): Promise<Country> {
    const country = await this.countryRepository.findById(command.countryId);
    if (!country) {
      throw new NotFoundError(`Country "${command.countryId}" not found.`);
    }

    country.update({ name: command.name, isActive: command.isActive });
    await this.countryRepository.save(country);

    return country;
  }
}
