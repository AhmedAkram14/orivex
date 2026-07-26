import { Country } from '../../../domain/entities/country.entity.js';
import type { CountryRepository } from '../../../domain/repositories/country.repository.js';

import type { CreateCountryCommand } from './create-country.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// reference.module.ts only.
export class CreateCountryUseCase {
  constructor(private readonly countryRepository: CountryRepository) {}

  async execute(command: CreateCountryCommand): Promise<Country> {
    const country = Country.create({ name: command.name, iso2Code: command.iso2Code });
    await this.countryRepository.save(country);
    return country;
  }
}
