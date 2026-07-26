import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Prisma } from '@prisma/client';

import { DoctorProfile } from '../../domain/entities/doctor-profile.entity.js';
import { DepartmentNotFoundError } from '../../domain/exceptions/department-not-found.error.js';
import { DoctorProfileAlreadyExistsError } from '../../domain/exceptions/doctor-profile-already-exists.error.js';
import { HospitalNotFoundError } from '../../domain/exceptions/hospital-not-found.error.js';
import { MedicalSpecialtyNotFoundError } from '../../domain/exceptions/medical-specialty-not-found.error.js';
import { mapDoctorError } from '../../presentation/mappers/doctor-exception.mapper.js';

import { PrismaDoctorProfileRepository } from './prisma-doctor-profile.repository.js';

function buildUniqueConstraintViolation(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed on the fields: (`accountId`)', {
    code: 'P2002',
    clientVersion: '5.22.0',
  });
}

// Onboarding Redesign (2026-07-21 proposal, Stage O.3): meta.field_name is
// how Postgres actually reports which FK failed (the constraint name), now
// that DoctorProfile has three nullable FKs instead of one -- the repository
// must inspect it rather than assume, so the fake must supply it too.
function buildForeignKeyConstraintViolation(fieldName: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(`Foreign key constraint failed on the field: \`${fieldName}\``, {
    code: 'P2003',
    clientVersion: '5.22.0',
    meta: { field_name: `DoctorProfile_${fieldName}_fkey (index)` },
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
      specialtyId: '11111111-1111-4111-8111-111111111111',
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
      specialtyId: '11111111-1111-4111-8111-111111111111',
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

  it('translates a P2003 foreign-key violation on hospitalId into HospitalNotFoundError', async () => {
    const noop = () => Promise.resolve();
    const fakePrisma = {
      doctorProfile: { upsert: noop },
      portfolioPublication: { deleteMany: noop, createMany: noop },
      portfolioAward: { deleteMany: noop, createMany: noop },
      $transaction: async () => {
        throw buildForeignKeyConstraintViolation('hospitalId');
      },
    } as never;
    const repository = new PrismaDoctorProfileRepository(fakePrisma);
    const profile = DoctorProfile.register({
      accountId: '44444444-4444-4444-8444-444444444444',
      licenseNumber: 'LIC-4',
      specialtyId: '11111111-1111-4111-8111-111111111111',
      hospitalId: '99999999-9999-4999-8999-999999999999',
    });

    await assert.rejects(() => repository.save(profile), HospitalNotFoundError);
  });

  it('translates a P2003 foreign-key violation on specialtyId into MedicalSpecialtyNotFoundError', async () => {
    const noop = () => Promise.resolve();
    const fakePrisma = {
      doctorProfile: { upsert: noop },
      portfolioPublication: { deleteMany: noop, createMany: noop },
      portfolioAward: { deleteMany: noop, createMany: noop },
      $transaction: async () => {
        throw buildForeignKeyConstraintViolation('specialtyId');
      },
    } as never;
    const repository = new PrismaDoctorProfileRepository(fakePrisma);
    const profile = DoctorProfile.register({
      accountId: '55555555-5555-4555-8555-555555555555',
      licenseNumber: 'LIC-5',
      specialtyId: '99999999-9999-4999-8999-999999999999',
    });

    await assert.rejects(() => repository.save(profile), MedicalSpecialtyNotFoundError);
  });

  it('translates a P2003 foreign-key violation on departmentId into DepartmentNotFoundError', async () => {
    const noop = () => Promise.resolve();
    const fakePrisma = {
      doctorProfile: { upsert: noop },
      portfolioPublication: { deleteMany: noop, createMany: noop },
      portfolioAward: { deleteMany: noop, createMany: noop },
      $transaction: async () => {
        throw buildForeignKeyConstraintViolation('departmentId');
      },
    } as never;
    const repository = new PrismaDoctorProfileRepository(fakePrisma);
    const profile = DoctorProfile.register({
      accountId: '66666666-6666-4666-8666-666666666666',
      licenseNumber: 'LIC-6',
      specialtyId: '11111111-1111-4111-8111-111111111111',
      hospitalId: '77777777-7777-4777-8777-777777777777',
      departmentId: '99999999-9999-4999-8999-999999999999',
    });

    await assert.rejects(() => repository.save(profile), DepartmentNotFoundError);
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
      specialtyId: '11111111-1111-4111-8111-111111111111',
    });

    await assert.rejects(() => repository.save(profile), (error: unknown) => error === otherError);
  });
});
