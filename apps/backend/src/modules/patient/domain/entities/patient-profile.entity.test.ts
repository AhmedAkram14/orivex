import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PatientDomainError } from '../exceptions/patient-domain.error.js';
import { EmergencyRelationship } from '../enums/emergency-relationship.enum.js';

import { PatientProfile } from './patient-profile.entity.js';

describe('PatientProfile', () => {
  it('creates an empty shell with no date of birth or emergency contacts', () => {
    const profile = PatientProfile.create({ accountId: '11111111-1111-4111-8111-111111111111' });

    assert.equal(profile.getAccountId(), '11111111-1111-4111-8111-111111111111');
    assert.equal(profile.getDateOfBirth(), undefined);
    assert.deepEqual(profile.getEmergencyContacts(), []);
    assert.equal(profile.releaseDomainEvents().length, 1);
  });

  it('creates a profile with a date of birth and emergency contacts', () => {
    const profile = PatientProfile.create({
      accountId: '11111111-1111-4111-8111-111111111111',
      dateOfBirth: new Date('1990-01-01'),
      emergencyContacts: [{ name: 'Jane Doe', relationship: EmergencyRelationship.Spouse, phoneNumber: '555-0100' }],
    });

    assert.equal(profile.getEmergencyContacts().length, 1);
    assert.equal(profile.getEmergencyContacts()[0].getName(), 'Jane Doe');
  });

  it('rejects a date of birth in the future', () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    assert.throws(
      () => PatientProfile.create({ accountId: '11111111-1111-4111-8111-111111111111', dateOfBirth: future }),
      PatientDomainError,
    );
  });

  it('updates date of birth and replaces emergency contacts, recording a new event', () => {
    const profile = PatientProfile.create({ accountId: '11111111-1111-4111-8111-111111111111' });
    profile.releaseDomainEvents();

    profile.update({
      dateOfBirth: new Date('1985-05-05'),
      emergencyContacts: [{ name: 'John Doe', relationship: EmergencyRelationship.Parent, phoneNumber: '555-0200' }],
    });

    assert.ok(profile.getDateOfBirth());
    assert.equal(profile.getEmergencyContacts().length, 1);
    assert.equal(profile.getEmergencyContacts()[0].getName(), 'John Doe');
    assert.equal(profile.releaseDomainEvents().length, 1);
  });
});
