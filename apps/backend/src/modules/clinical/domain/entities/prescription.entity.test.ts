import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PrescriptionStatus } from '../enums/prescription-status.enum.js';
import { ClinicalDomainError } from '../exceptions/clinical-domain.error.js';

import { Prescription } from './prescription.entity.js';

function signValidPrescription(): Prescription {
  return Prescription.sign({
    consultationSessionId: '11111111-1111-4111-8111-111111111111',
    diagnosisNodeId: '22222222-2222-4222-8222-222222222222',
    authoringDoctorId: '33333333-3333-4333-8333-333333333333',
    lineItems: [{ drugCatalogId: '44444444-4444-4444-8444-444444444444', dosage: '5mg', frequency: 'once daily', durationDays: 30 }],
  });
}

describe('Prescription', () => {
  it('signs directly into Signed status and records PrescriptionSigned', () => {
    const prescription = signValidPrescription();

    assert.equal(prescription.getStatus(), PrescriptionStatus.Signed);
    assert.ok(prescription.getSignedAt());
    assert.equal(prescription.getLineItems().length, 1);
    assert.equal(prescription.releaseDomainEvents().length, 1);
  });

  it('rejects signing with no line items', () => {
    assert.throws(
      () =>
        Prescription.sign({
          consultationSessionId: '11111111-1111-4111-8111-111111111111',
          diagnosisNodeId: '22222222-2222-4222-8222-222222222222',
          authoringDoctorId: '33333333-3333-4333-8333-333333333333',
          lineItems: [],
        }),
      ClinicalDomainError,
    );
  });

  it('rejects a line item with an invalid durationDays', () => {
    assert.throws(
      () =>
        Prescription.sign({
          consultationSessionId: '11111111-1111-4111-8111-111111111111',
          diagnosisNodeId: '22222222-2222-4222-8222-222222222222',
          authoringDoctorId: '33333333-3333-4333-8333-333333333333',
          lineItems: [{ drugCatalogId: '44444444-4444-4444-8444-444444444444', dosage: '5mg', frequency: 'once daily', durationDays: 0 }],
        }),
      ClinicalDomainError,
    );
  });
});
