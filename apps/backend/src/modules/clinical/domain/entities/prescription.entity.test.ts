import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PrescriptionStatus } from '../enums/prescription-status.enum.js';
import { ClinicalDomainError } from '../exceptions/clinical-domain.error.js';

import { Prescription } from './prescription.entity.js';
import { PrescriptionLineItem } from './prescription-line-item.entity.js';

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

  it('isCurrentlyActive is true right after signing (well within the duration window)', () => {
    const prescription = signValidPrescription();
    assert.equal(prescription.isCurrentlyActive(new Date()), true);
  });

  it('isCurrentlyActive is false once now is past signedAt + the longest line item duration', () => {
    const signedAt = new Date('2026-01-01T00:00:00.000Z');
    const prescription = Prescription.reconstitute({
      id: '55555555-5555-4555-8555-555555555555',
      consultationSessionId: '11111111-1111-4111-8111-111111111111',
      diagnosisNodeId: '22222222-2222-4222-8222-222222222222',
      authoringDoctorId: '33333333-3333-4333-8333-333333333333',
      status: PrescriptionStatus.Signed,
      signedAt,
      lineItems: [
        PrescriptionLineItem.reconstitute({
          id: '66666666-6666-4666-8666-666666666666',
          drugCatalogId: '44444444-4444-4444-8444-444444444444',
          dosage: '500mg',
          frequency: 'twice daily',
          durationDays: 5,
        }),
      ],
      createdAt: signedAt,
      updatedAt: signedAt,
    });

    const now = new Date(signedAt.getTime() + 10 * 24 * 60 * 60 * 1000);
    assert.equal(prescription.isCurrentlyActive(now), false);
  });

  it('isCurrentlyActive is false when the prescription has not been signed', () => {
    const prescription = Prescription.reconstitute({
      id: '77777777-7777-4777-8777-777777777777',
      consultationSessionId: '11111111-1111-4111-8111-111111111111',
      diagnosisNodeId: '22222222-2222-4222-8222-222222222222',
      authoringDoctorId: '33333333-3333-4333-8333-333333333333',
      status: PrescriptionStatus.Signed,
      signedAt: undefined,
      lineItems: [
        PrescriptionLineItem.reconstitute({
          id: '88888888-8888-4888-8888-888888888888',
          drugCatalogId: '44444444-4444-4444-8444-444444444444',
          dosage: '500mg',
          frequency: 'twice daily',
          durationDays: 30,
        }),
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    assert.equal(prescription.isCurrentlyActive(new Date()), false);
  });
});
