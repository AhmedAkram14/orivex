import { Injectable } from '@nestjs/common';
import { TokenStatus as PrismaTokenStatus } from '@prisma/client';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { AuthToken } from '../../domain/entities/auth-token.entity.js';
import type { TokenPurpose } from '../../domain/enums/token-purpose.enum.js';
import type { AuthTokenRepository } from '../../domain/repositories/auth-token.repository.js';
import type { TokenHash } from '../../domain/value-objects/token-hash.value-object.js';

import { toDomainAuthToken, toPersistedAuthToken, toPrismaTokenPurpose } from './auth-token.mapper.js';

@Injectable()
export class PrismaAuthTokenRepository implements AuthTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  // tokenHash is globally unique, so a single findUnique plus an in-memory
  // purpose/status check is equivalent to (and simpler than) a compound
  // where-clause, and still only ever touches one row.
  async findActiveByHash(hash: TokenHash, purpose: TokenPurpose): Promise<AuthToken | null> {
    const row = await this.prisma.authToken.findUnique({ where: { tokenHash: hash.toString() } });
    if (!row || row.purpose !== toPrismaTokenPurpose(purpose) || row.status !== PrismaTokenStatus.ACTIVE) {
      return null;
    }
    return toDomainAuthToken(row);
  }

  async save(token: AuthToken): Promise<void> {
    const data = toPersistedAuthToken(token);
    await this.prisma.authToken.upsert({ where: { id: data.id }, create: data, update: data });
  }
}
