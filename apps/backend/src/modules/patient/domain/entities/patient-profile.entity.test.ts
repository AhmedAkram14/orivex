import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EmergencyRelationship } from '../enums/emergency-relationship.enum.js';
import { BloodType } from '../enums/blood-type.enum.js';

import { PatientProfile } from './patient-profile.entity.js';

describe('PatientProfile', () => {
  it('creates an empty shell with no emergency contacts and no medical-profile fields', () => {
    const profile = PatientProfile.create({ accountId: '11111111-1111-4111-8111-111111111111' });

    assert.equal(profile.getAccountId(), '11111111-1111-4111-8111-111111111111');
    assert.deepEqual(profile.getEmergencyContacts(), []);
    assert.equal(profile.getBloodType(), undefined);
    assert.equal(profile.getAllergies(), undefined);
    assert.equal(profile.getChronicDiseases(), undefined);
    assert.equal(profile.getInsuranceProviderId(), undefined);
    assert.equal(profile.releaseDomainEvents().length, 1);
  });

  it('creates a profile with emergency contacts', () => {
    const profile = PatientProfile.create({
      accountId: '11111111-1111-4111-8111-111111111111',
      emergencyContacts: [{ name: 'Jane Doe', relationship: EmergencyRelationship.Spouse, phoneNumber: '555-0100' }],
    });

    assert.equal(profile.getEmergencyContacts().length, 1);
    assert.equal(profile.getEmergencyContacts()[0].getName(), 'Jane Doe');
  });

  it('replaces emergency contacts on update, recording a new event', () => {
    const profile = PatientProfile.create({ accountId: '11111111-1111-4111-8111-111111111111' });
    profile.releaseDomainEvents();

    profile.update({
      emergencyContacts: [{ name: 'John Doe', relationship: EmergencyRelationship.Parent, phoneNumber: '555-0200' }],
    });

    assert.equal(profile.getEmergencyContacts().length, 1);
    assert.equal(profile.getEmergencyContacts()[0].getName(), 'John Doe');
    assert.equal(profile.releaseDomainEvents().length, 1);
  });

  it('sets bloodType/allergies/chronicDiseases/insuranceProviderId on update (Onboarding Redesign Stage O.3)', () => {
    const profile = PatientProfile.create({ accountId: '11111111-1111-4111-8111-111111111111' });

    profile.update({
      bloodType: BloodType.OPositive,
      allergies: 'Penicillin',
      chronicDiseases: 'Type 2 diabetes',
      insuranceProviderId: '22222222-2222-4222-8222-222222222222',
    });

    assert.equal(profile.getBloodType(), BloodType.OPositive);
    assert.equal(profile.getAllergies(), 'Penicillin');
    assert.equal(profile.getChronicDiseases(), 'Type 2 diabetes');
    assert.equal(profile.getInsuranceProviderId(), '22222222-2222-4222-8222-222222222222');
  });

  it('clears medical-profile fields when explicitly set to null', () => {
    const profile = PatientProfile.create({ accountId: '11111111-1111-4111-8111-111111111111' });
    profile.update({ bloodType: BloodType.OPositive, allergies: 'Penicillin' });

    profile.update({ bloodType: null, allergies: null });

    assert.equal(profile.getBloodType(), undefined);
    assert.equal(profile.getAllergies(), undefined);
  });
});
