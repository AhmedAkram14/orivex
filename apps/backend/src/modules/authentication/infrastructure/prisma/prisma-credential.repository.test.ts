import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Prisma } from '@prisma/client';

import { Credential } from '../../domain/entities/credential.entity.js';
import { CredentialAlreadyExistsError } from '../../domain/exceptions/credential-already-exists.error.js';
import { PasswordHash } from '../../domain/value-objects/password-hash.value-object.js';

import { PrismaCredentialRepository } from './prisma-credential.repository.js';

function buildUniqueConstraintViolation(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed on the fields: (`accountId`)', {
    code: 'P2002',
    clientVersion: '5.22.0',
  });
}

describe('PrismaCredentialRepository', () => {
  it('translates a P2002 unique-constraint violation into CredentialAlreadyExistsError', async () => {
    const fakePrisma = {
      credential: {
        upsert: async () => {
          throw buildUniqueConstraintViolation();
        },
      },
    } as never;
    const repository = new PrismaCredentialRepository(fakePrisma);
    const credential = Credential.register({
      accountId: '11111111-1111-4111-8111-111111111111',
      passwordHash: PasswordHash.create('hashed'),
    });

    await assert.rejects(() => repository.save(credential), CredentialAlreadyExistsError);
  });

  it('rethrows any other error unchanged', async () => {
    const otherError = new Error('connection lost');
    const fakePrisma = {
      credential: {
        upsert: async () => {
          throw otherError;
        },
      },
    } as never;
    const repository = new PrismaCredentialRepository(fakePrisma);
    const credential = Credential.register({
      accountId: '22222222-2222-4222-8222-222222222222',
      passwordHash: PasswordHash.create('hashed'),
    });

    await assert.rejects(() => repository.save(credential), (error: unknown) => error === otherError);
  });
});
