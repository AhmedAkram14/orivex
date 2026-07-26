import type { Country } from '../entities/country.entity.js';

export interface CountryRepository {
  findAll(): Promise<Country[]>;
  findById(id: string): Promise<Country | null>;
  save(country: Country): Promise<void>;
}
