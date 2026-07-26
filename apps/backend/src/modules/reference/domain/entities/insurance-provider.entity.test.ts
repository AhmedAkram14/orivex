import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { InsuranceProvider } from './insurance-provider.entity.js';

describe('InsuranceProvider', () => {
  it('creates a new provider, active by default', () => {
    const provider = InsuranceProvider.create({ name: 'Allianz Egypt' });

    assert.equal(provider.getName(), 'Allianz Egypt');
    assert.equal(provider.getIsActive(), true);
  });

  it('updates name and isActive independently', () => {
    const provider = InsuranceProvider.create({ name: 'Allianz Egypt' });

    provider.update({ isActive: false });

    assert.equal(provider.getName(), 'Allianz Egypt');
    assert.equal(provider.getIsActive(), false);
  });
});
