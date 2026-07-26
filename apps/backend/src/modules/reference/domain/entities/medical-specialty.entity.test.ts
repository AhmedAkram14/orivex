import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MedicalSpecialty } from './medical-specialty.entity.js';

describe('MedicalSpecialty', () => {
  it('creates a new specialty, active by default', () => {
    const specialty = MedicalSpecialty.create({ name: 'Cardiology' });

    assert.equal(specialty.getName(), 'Cardiology');
    assert.equal(specialty.getIsActive(), true);
    assert.ok(specialty.getId());
  });

  it('updates name and isActive independently', () => {
    const specialty = MedicalSpecialty.create({ name: 'Cardiology' });
    const updatedAtBefore = specialty.getUpdatedAt();

    specialty.update({ isActive: false });

    assert.equal(specialty.getName(), 'Cardiology');
    assert.equal(specialty.getIsActive(), false);
    assert.ok(specialty.getUpdatedAt() >= updatedAtBefore);

    specialty.update({ name: 'Cardiology & Cardiothoracic Surgery' });
    assert.equal(specialty.getName(), 'Cardiology & Cardiothoracic Surgery');
    assert.equal(specialty.getIsActive(), false);
  });
});
