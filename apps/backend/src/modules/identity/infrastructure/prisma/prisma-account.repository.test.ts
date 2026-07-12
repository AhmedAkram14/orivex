import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Prisma } from '@prisma/client';

import { Account } from '../../domain/entities/account.entity.js';
import { AccountAlreadyExistsError } from '../../domain/exceptions/account-already-exists.error.js';
import { AccountRole } from '../../domain/enums/account-role.enum.js';
import { Language } from '../../domain/enums/language.enum.js';
import { DisplayName } from '../../domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../domain/value-objects/email-address.value-object.js';

import { PrismaAccountRepository } from './prisma-account.repository.js';

function buildUniqueConstraintViolation(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed on the fields: (`email`)', {
    code: 'P2002',
    clientVersion: '5.22.0',
  });
}

describe('PrismaAccountRepository', () => {
  it('translates a P2002 unique-constraint violation into AccountAlreadyExistsError', async () => {
    const fakePrisma = {
      account: {
        upsert: async () => {
          throw buildUniqueConstraintViolation();
        },
      },
    } as never;
    const repository = new PrismaAccountRepository(fakePrisma);
    const account = Account.register({
      email: EmailAddress.create('doctor@example.com'),
      keycloakId: 'keycloak-1',
      role: AccountRole.Patient,
      displayName: DisplayName.create('Dr. Test'),
      preferredLanguage: Language.English,
    });

    await assert.rejects(() => repository.save(account), AccountAlreadyExistsError);
  });

  it('rethrows any other error unchanged', async () => {
    const otherError = new Error('connection lost');
    const fakePrisma = {
      account: {
        upsert: async () => {
          throw otherError;
        },
      },
    } as never;
    const repository = new PrismaAccountRepository(fakePrisma);
    const account = Account.register({
      email: EmailAddress.create('doctor2@example.com'),
      keycloakId: 'keycloak-2',
      role: AccountRole.Patient,
      displayName: DisplayName.create('Dr. Test'),
      preferredLanguage: Language.English,
    });

    await assert.rejects(() => repository.save(account), (error: unknown) => error === otherError);
  });
});
