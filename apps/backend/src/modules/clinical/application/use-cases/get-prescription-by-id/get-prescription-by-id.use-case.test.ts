import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Prescription } from '../../../domain/entities/prescription.entity.js';
import type { PrescriptionRepository } from '../../../domain/repositories/prescription.repository.js';

import { GetPrescriptionByIdUseCase } from './get-prescription-by-id.use-case.js';

class FakePrescriptionRepository implements PrescriptionRepository {
  constructor(private readonly prescription: Prescription | null) {}
  async findById(): Promise<Prescription | null> {
    return this.prescription;
  }
  async findByConsultationSessionId(): Promise<Prescription[]> {
    return this.prescription ? [this.prescription] : [];
  }
  async save(): Promise<void> {}
}

describe('GetPrescriptionByIdUseCase', () => {
  it('returns the prescription when it exists', async () => {
    const prescription = Prescription.sign({
      consultationSessionId: '11111111-1111-4111-8111-111111111111',
      diagnosisNodeId: '22222222-2222-4222-8222-222222222222',
      authoringDoctorId: '33333333-3333-4333-8333-333333333333',
      lineItems: [{ drugCatalogId: '44444444-4444-4444-8444-444444444444', dosage: '5mg', frequency: 'once daily', durationDays: 30 }],
    });
    const useCase = new GetPrescriptionByIdUseCase(new FakePrescriptionRepository(prescription));

    const result = await useCase.execute({ prescriptionId: prescription.getId() });

    assert.equal(result?.getId(), prescription.getId());
  });

  it('returns null (not a thrown error) when the prescription does not exist', async () => {
    const useCase = new GetPrescriptionByIdUseCase(new FakePrescriptionRepository(null));

    const result = await useCase.execute({ prescriptionId: '99999999-9999-4999-8999-999999999999' });

    assert.equal(result, null);
  });
});
