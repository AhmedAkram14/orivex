import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../shared/errors/app-error.js';
import { Country } from '../../domain/entities/country.entity.js';
import type { CountryRepository } from '../../domain/repositories/country.repository.js';

import { CreateCountryCommand } from './create-country/create-country.command.js';
import { CreateCountryUseCase } from './create-country/create-country.use-case.js';
import { ListCountriesUseCase } from './list-countries/list-countries.use-case.js';
import { UpdateCountryCommand } from './update-country/update-country.command.js';
import { UpdateCountryUseCase } from './update-country/update-country.use-case.js';

class FakeCountryRepository implements CountryRepository {
  private readonly byId = new Map<string, Country>();

  async findAll(): Promise<Country[]> {
    return [...this.byId.values()];
  }
  async findById(id: string): Promise<Country | null> {
    return this.byId.get(id) ?? null;
  }
  async save(country: Country): Promise<void> {
    this.byId.set(country.getId(), country);
  }
}

describe('Reference use cases — Country', () => {
  it('ListCountriesUseCase returns everything saved', async () => {
    const repo = new FakeCountryRepository();
    await repo.save(Country.create({ name: 'Egypt', iso2Code: 'EG' }));

    const result = await new ListCountriesUseCase(repo).execute();

    assert.equal(result.length, 1);
    assert.equal(result[0].getIso2Code(), 'EG');
  });

  it('CreateCountryUseCase creates and persists a new country', async () => {
    const repo = new FakeCountryRepository();

    const country = await new CreateCountryUseCase(repo).execute(
      new CreateCountryCommand({ name: 'Saudi Arabia', iso2Code: 'sa' }),
    );

    assert.equal(country.getIso2Code(), 'SA');
    assert.equal((await repo.findAll()).length, 1);
  });

  it('UpdateCountryUseCase updates an existing country', async () => {
    const repo = new FakeCountryRepository();
    const country = Country.create({ name: 'Egypt', iso2Code: 'EG' });
    await repo.save(country);

    const updated = await new UpdateCountryUseCase(repo).execute(
      new UpdateCountryCommand({ countryId: country.getId(), isActive: false }),
    );

    assert.equal(updated.getIsActive(), false);
  });

  it('UpdateCountryUseCase throws NotFoundError for an unknown id', async () => {
    const repo = new FakeCountryRepository();

    await assert.rejects(
      () =>
        new UpdateCountryUseCase(repo).execute(
          new UpdateCountryCommand({ countryId: '11111111-1111-4111-8111-111111111111' }),
        ),
      NotFoundError,
    );
  });
});
