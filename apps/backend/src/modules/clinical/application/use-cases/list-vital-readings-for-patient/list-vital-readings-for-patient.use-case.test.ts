import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { VitalReading } from '../../../domain/entities/vital-reading.entity.js';
import { VitalType } from '../../../domain/enums/vital-type.enum.js';
import type { VitalReadingRepository } from '../../../domain/repositories/vital-reading.repository.js';

import { ListVitalReadingsForPatientUseCase } from './list-vital-readings-for-patient.use-case.js';

class FakeVitalReadingRepository implements VitalReadingRepository {
  constructor(private readonly readings: VitalReading[]) {}
  async findByPatientId(patientId: string): Promise<VitalReading[]> {
    return this.readings.filter((r) => r.getPatientId() === patientId);
  }
  async findByConsultationSessionId(consultationSessionId: string): Promise<VitalReading[]> {
    return this.readings.filter((r) => r.getConsultationSessionId() === consultationSessionId);
  }
  async save(): Promise<void> {}
}

describe('ListVitalReadingsForPatientUseCase', () => {
  it('returns only the vital readings belonging to the given patient', async () => {
    const patientId = '11111111-1111-4111-8111-111111111111';
    const otherPatientId = '22222222-2222-4222-8222-222222222222';
    const mine = VitalReading.create({ patientId, type: VitalType.Weight, value: 72 });
    const theirs = VitalReading.create({ patientId: otherPatientId, type: VitalType.Weight, value: 80 });
    const useCase = new ListVitalReadingsForPatientUseCase(new FakeVitalReadingRepository([mine, theirs]));

    const result = await useCase.execute({ patientId });

    assert.equal(result.length, 1);
    assert.equal(result[0]?.getId(), mine.getId());
  });

  it('returns an empty array (not a thrown error) when the patient has no vital readings', async () => {
    const useCase = new ListVitalReadingsForPatientUseCase(new FakeVitalReadingRepository([]));

    const result = await useCase.execute({ patientId: '99999999-9999-4999-8999-999999999999' });

    assert.deepEqual(result, []);
  });
});
