import type { Country } from '../../../domain/entities/country.entity.js';
import type { CountryRepository } from '../../../domain/repositories/country.repository.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// reference.module.ts only.
export class ListCountriesUseCase {
  constructor(private readonly countryRepository: CountryRepository) {}

  async execute(): Promise<Country[]> {
    return this.countryRepository.findAll();
  }
}
