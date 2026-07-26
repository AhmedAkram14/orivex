import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../shared/errors/app-error.js';
import { MedicalSpecialty } from '../../domain/entities/medical-specialty.entity.js';
import type { MedicalSpecialtyRepository } from '../../domain/repositories/medical-specialty.repository.js';

import { CreateMedicalSpecialtyCommand } from './create-medical-specialty/create-medical-specialty.command.js';
import { CreateMedicalSpecialtyUseCase } from './create-medical-specialty/create-medical-specialty.use-case.js';
import { ListMedicalSpecialtiesUseCase } from './list-medical-specialties/list-medical-specialties.use-case.js';
import { UpdateMedicalSpecialtyCommand } from './update-medical-specialty/update-medical-specialty.command.js';
import { UpdateMedicalSpecialtyUseCase } from './update-medical-specialty/update-medical-specialty.use-case.js';

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

describe('Reference use cases — MedicalSpecialty', () => {
  it('ListMedicalSpecialtiesUseCase returns everything saved', async () => {
    const repo = new FakeMedicalSpecialtyRepository();
    await repo.save(MedicalSpecialty.create({ name: 'Dermatology' }));

    const result = await new ListMedicalSpecialtiesUseCase(repo).execute();

    assert.equal(result.length, 1);
    assert.equal(result[0].getName(), 'Dermatology');
  });

  it('CreateMedicalSpecialtyUseCase creates and persists a new specialty', async () => {
    const repo = new FakeMedicalSpecialtyRepository();

    const specialty = await new CreateMedicalSpecialtyUseCase(repo).execute(
      new CreateMedicalSpecialtyCommand({ name: 'Neurology' }),
    );

    assert.equal(specialty.getName(), 'Neurology');
    assert.equal((await repo.findAll()).length, 1);
  });

  it('UpdateMedicalSpecialtyUseCase updates an existing specialty', async () => {
    const repo = new FakeMedicalSpecialtyRepository();
    const specialty = MedicalSpecialty.create({ name: 'Neurology' });
    await repo.save(specialty);

    const updated = await new UpdateMedicalSpecialtyUseCase(repo).execute(
      new UpdateMedicalSpecialtyCommand({ medicalSpecialtyId: specialty.getId(), isActive: false }),
    );

    assert.equal(updated.getIsActive(), false);
    assert.equal(updated.getName(), 'Neurology');
  });

  it('UpdateMedicalSpecialtyUseCase throws NotFoundError for an unknown id', async () => {
    const repo = new FakeMedicalSpecialtyRepository();

    await assert.rejects(
      () =>
        new UpdateMedicalSpecialtyUseCase(repo).execute(
          new UpdateMedicalSpecialtyCommand({ medicalSpecialtyId: '11111111-1111-4111-8111-111111111111' }),
        ),
      NotFoundError,
    );
  });
});
