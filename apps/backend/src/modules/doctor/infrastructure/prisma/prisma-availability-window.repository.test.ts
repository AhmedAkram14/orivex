import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Prisma } from '@prisma/client';

import { AvailabilityWindowConflictError } from '../../domain/exceptions/availability-window-conflict.error.js';

import { PrismaAvailabilityWindowRepository } from './prisma-availability-window.repository.js';

function buildForeignKeyConstraintViolation(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    'Foreign key constraint failed on the field: `Appointment_availabilityWindowId_fkey (index)`',
    { code: 'P2003', clientVersion: '5.22.0' },
  );
}

function buildRecordNotFound(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('An operation failed because it depends on one or more records that were required but not found.', {
    code: 'P2025',
    clientVersion: '5.22.0',
  });
}

describe('PrismaAvailabilityWindowRepository.deleteById', () => {
  it('deletes a real row with no complaint', async () => {
    let deletedId: string | undefined;
    const fakePrisma = {
      availabilityWindow: {
        delete: async ({ where }: { where: { id: string } }) => {
          deletedId = where.id;
        },
      },
    } as never;
    const repository = new PrismaAvailabilityWindowRepository(fakePrisma);

    await repository.deleteById('11111111-1111-4111-8111-111111111111');

    assert.equal(deletedId, '11111111-1111-4111-8111-111111111111');
  });

  it('translates a P2003 foreign-key violation (a real Appointment still references this window) into AvailabilityWindowConflictError', async () => {
    const fakePrisma = {
      availabilityWindow: {
        delete: async () => {
          throw buildForeignKeyConstraintViolation();
        },
      },
    } as never;
    const repository = new PrismaAvailabilityWindowRepository(fakePrisma);

    await assert.rejects(
      () => repository.deleteById('11111111-1111-4111-8111-111111111111'),
      AvailabilityWindowConflictError,
    );
  });

  it('treats a P2025 "already gone" as a no-op success rather than an error', async () => {
    const fakePrisma = {
      availabilityWindow: {
        delete: async () => {
          throw buildRecordNotFound();
        },
      },
    } as never;
    const repository = new PrismaAvailabilityWindowRepository(fakePrisma);

    await repository.deleteById('11111111-1111-4111-8111-111111111111');
  });
});
