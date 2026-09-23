import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EmergencyRelationship } from '../enums/emergency-relationship.enum.js';
import { BloodType } from '../enums/blood-type.enum.js';
import { PatientDomainError } from '../exceptions/patient-domain.error.js';

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

  const DOCTOR_ID = '22222222-2222-4222-8222-222222222222';

  // Doctor Patient Chart plan, 4.3.
  describe('confirmNoKnownAllergies', () => {
    it('sets allergiesConfirmedNoneAt and allergiesConfirmedByDoctorId when no allergies are on record', () => {
      const profile = PatientProfile.create({ accountId: '11111111-1111-4111-8111-111111111111' });
      profile.releaseDomainEvents();

      profile.confirmNoKnownAllergies(DOCTOR_ID);

      assert.ok(profile.getAllergiesConfirmedNoneAt() instanceof Date);
      assert.equal(profile.getAllergiesConfirmedByDoctorId(), DOCTOR_ID);
      assert.equal(profile.releaseDomainEvents().length, 1);
    });

    it('throws PatientDomainError and never sets the confirmation when a real allergy is already on record', () => {
      const profile = PatientProfile.create({ accountId: '11111111-1111-4111-8111-111111111111' });
      profile.update({ allergies: 'Penicillin' });

      assert.throws(() => profile.confirmNoKnownAllergies(DOCTOR_ID), PatientDomainError);
      assert.equal(profile.getAllergiesConfirmedNoneAt(), null);
    });

    it('is cleared again the moment a real allergy is recorded, since the two states are mutually exclusive', () => {
      const profile = PatientProfile.create({ accountId: '11111111-1111-4111-8111-111111111111' });
      profile.confirmNoKnownAllergies(DOCTOR_ID);
      assert.ok(profile.getAllergiesConfirmedNoneAt() instanceof Date);

      profile.update({ allergies: 'Latex' });

      assert.equal(profile.getAllergiesConfirmedNoneAt(), null);
      assert.equal(profile.getAllergiesConfirmedByDoctorId(), undefined);
      assert.equal(profile.getAllergies(), 'Latex');
    });

    it('reconstitutes a pre-existing confirmation with no doctor id as a valid, non-error state', () => {
      const profile = PatientProfile.reconstitute({
        id: '33333333-3333-4333-8333-333333333333',
        accountId: '11111111-1111-4111-8111-111111111111',
        emergencyContacts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        allergiesConfirmedNoneAt: new Date('2026-03-12T00:00:00.000Z'),
        allergiesConfirmedByDoctorId: null,
      });

      assert.ok(profile.getAllergiesConfirmedNoneAt() instanceof Date);
      assert.equal(profile.getAllergiesConfirmedByDoctorId(), undefined);
    });
  });
});
