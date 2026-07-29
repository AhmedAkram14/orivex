import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MedicalSpecialty } from '../../../../reference/domain/entities/medical-specialty.entity.js';
import { ListMedicalSpecialtiesUseCase } from '../../../../reference/application/use-cases/list-medical-specialties/list-medical-specialties.use-case.js';
import type { MedicalSpecialtyRepository } from '../../../../reference/domain/repositories/medical-specialty.repository.js';
import type { PublicDirectoryQueryPort, PublicSpecialtyCount } from '../../ports/public-directory-query.port.js';

import { ListPublicSpecialtiesUseCase } from './list-public-specialties.use-case.js';

class FakeMedicalSpecialtyRepository implements MedicalSpecialtyRepository {
  private readonly byId = new Map<string, MedicalSpecialty>();
  async findAll(): Promise<MedicalSpecialty[]> {
    return [...this.byId.values()];
  }
  async findById(id: string): Promise<MedicalSpecialty | null> {
    return this.byId.get(id) ?? null;
  }
  async save(specialty: MedicalSpecialty): Promise<void> {
    this.byId.set(specialty.getId(), specialty);
  }
}

class FakePublicDirectoryQueryPort implements PublicDirectoryQueryPort {
  constructor(private readonly counts: PublicSpecialtyCount[] = []) {}
  async countDoctorsBySpecialty(): Promise<PublicSpecialtyCount[]> {
    return this.counts;
  }
  async searchDoctors(): Promise<never> {
    throw new Error('not used by this test');
  }
}

describe('ListPublicSpecialtiesUseCase', () => {
  it('returns only active specialties, each with its real doctor count, sorted by count descending', async () => {
    const repo = new FakeMedicalSpecialtyRepository();
    const dermatology = MedicalSpecialty.create({ name: 'Dermatology' });
    const cardiology = MedicalSpecialty.create({ name: 'Cardiology' });
    const inactive = MedicalSpecialty.create({ name: 'Retired Specialty' });
    inactive.update({ isActive: false });
    await repo.save(dermatology);
    await repo.save(cardiology);
    await repo.save(inactive);

    const queryPort = new FakePublicDirectoryQueryPort([
      { specialtyId: dermatology.getId(), doctorCount: 2 },
      { specialtyId: cardiology.getId(), doctorCount: 5 },
    ]);

    const result = await new ListPublicSpecialtiesUseCase(new ListMedicalSpecialtiesUseCase(repo), queryPort).execute();

    assert.equal(result.length, 2);
    assert.equal(result[0].name, 'Cardiology');
    assert.equal(result[0].doctorCount, 5);
    assert.equal(result[1].name, 'Dermatology');
    assert.equal(result[1].doctorCount, 2);
  });

  it('defaults doctorCount to 0 for a specialty with no counted doctors', async () => {
    const repo = new FakeMedicalSpecialtyRepository();
    const specialty = MedicalSpecialty.create({ name: 'Oncology' });
    await repo.save(specialty);

    const result = await new ListPublicSpecialtiesUseCase(
      new ListMedicalSpecialtiesUseCase(repo),
      new FakePublicDirectoryQueryPort([]),
    ).execute();

    assert.equal(result.length, 1);
    assert.equal(result[0].doctorCount, 0);
  });
});
