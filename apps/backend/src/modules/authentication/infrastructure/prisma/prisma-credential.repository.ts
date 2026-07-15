import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { Credential } from '../../domain/entities/credential.entity.js';
import { CredentialAlreadyExistsError } from '../../domain/exceptions/credential-already-exists.error.js';
import type { CredentialRepository } from '../../domain/repositories/credential.repository.js';

import { toDomainCredential, toPersistedCredential } from './credential.mapper.js';

function isUniqueConstraintViolation(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

@Injectable()
export class PrismaCredentialRepository implements CredentialRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByAccountId(accountId: string): Promise<Credential | null> {
    const row = await this.prisma.credential.findUnique({ where: { accountId } });
    return row ? toDomainCredential(row) : null;
  }

  async findById(id: string): Promise<Credential | null> {
    const row = await this.prisma.credential.findUnique({ where: { id } });
    return row ? toDomainCredential(row) : null;
  }

  // Mirrors PrismaAccountRepository.save()'s reasoning: RegisterUseCase's
  // own flow has no check-then-act guard of its own for Credential (Identity's
  // RegisterAccountUseCase already closes the email race), but Credential.
  // accountId is DB-unique too -- catching P2002 here closes any remaining
  // concurrent-registration gap rather than surfacing an unmapped 500.
  async save(credential: Credential): Promise<void> {
    const data = toPersistedCredential(credential);

    try {
      await this.prisma.credential.upsert({
        where: { id: data.id },
        create: data,
        update: data,
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new CredentialAlreadyExistsError(credential.getAccountId());
      }
      throw error;
    }
  }
}
