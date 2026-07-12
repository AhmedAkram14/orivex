import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Prisma } from '@prisma/client';

import { DoctorProfile } from '../../domain/entities/doctor-profile.entity.js';
import { DoctorProfileAlreadyExistsError } from '../../domain/exceptions/doctor-profile-already-exists.error.js';
import { mapDoctorError } from '../../presentation/mappers/doctor-exception.mapper.js';

import { PrismaDoctorProfileRepository } from './prisma-doctor-profile.repository.js';

function buildUniqueConstraintViolation(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed on the fields: (`accountId`)', {
    code: 'P2002',
    clientVersion: '5.22.0',
  });
}

describe('PrismaDoctorProfileRepository', () => {
  it('translates a P2002 unique-constraint violation into DoctorProfileAlreadyExistsError', async () => {
    const noop = () => Promise.resolve();
    const fakePrisma = {
      doctorProfile: { upsert: noop },
      portfolioPublication: { deleteMany: noop, createMany: noop },
      portfolioAward: { deleteMany: noop, createMany: noop },
      $transaction: async () => {
        throw buildUniqueConstraintViolation();
      },
    } as never;
    const repository = new PrismaDoctorProfileRepository(fakePrisma);
    const profile = DoctorProfile.register({
      accountId: '11111111-1111-4111-8111-111111111111',
      licenseNumber: 'LIC-1',
      specialty: 'Cardiology',
    });

    await assert.rejects(() => repository.save(profile), DoctorProfileAlreadyExistsError);
  });

  it('maps a concurrent unique-constraint violation to 409, not 500', async () => {
    const noop = () => Promise.resolve();
    const fakePrisma = {
      doctorProfile: { upsert: noop },
      portfolioPublication: { deleteMany: noop, createMany: noop },
      portfolioAward: { deleteMany: noop, createMany: noop },
      $transaction: async () => {
        throw buildUniqueConstraintViolation();
      },
    } as never;
    const repository = new PrismaDoctorProfileRepository(fakePrisma);
    const profile = DoctorProfile.register({
      accountId: '33333333-3333-4333-8333-333333333333',
      licenseNumber: 'LIC-3',
      specialty: 'Neurology',
    });

    let caught: unknown;
    try {
      await repository.save(profile);
    } catch (error) {
      caught = error;
    }

    const mapped = mapDoctorError(caught) as { httpStatus: number; code: string };
    assert.equal(mapped.httpStatus, 409);
    assert.equal(mapped.code, 'CONFLICT');
  });

  it('rethrows any other error unchanged', async () => {
    const otherError = new Error('connection lost');
    const noop = () => Promise.resolve();
    const fakePrisma = {
      doctorProfile: { upsert: noop },
      portfolioPublication: { deleteMany: noop, createMany: noop },
      portfolioAward: { deleteMany: noop, createMany: noop },
      $transaction: async () => {
        throw otherError;
      },
    } as never;
    const repository = new PrismaDoctorProfileRepository(fakePrisma);
    const profile = DoctorProfile.register({
      accountId: '22222222-2222-4222-8222-222222222222',
      licenseNumber: 'LIC-2',
      specialty: 'Dermatology',
    });

    await assert.rejects(() => repository.save(profile), (error: unknown) => error === otherError);
  });
});
