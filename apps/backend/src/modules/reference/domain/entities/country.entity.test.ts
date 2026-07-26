import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Country } from './country.entity.js';

describe('Country', () => {
  it('creates a new country, active by default, uppercasing the iso2Code', () => {
    const country = Country.create({ name: 'Egypt', iso2Code: 'eg' });

    assert.equal(country.getName(), 'Egypt');
    assert.equal(country.getIso2Code(), 'EG');
    assert.equal(country.getIsActive(), true);
  });

  it('updates name and isActive independently', () => {
    const country = Country.create({ name: 'Egypt', iso2Code: 'EG' });

    country.update({ isActive: false });

    assert.equal(country.getName(), 'Egypt');
    assert.equal(country.getIsActive(), false);
  });
});
