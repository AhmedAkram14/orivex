import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { Session } from '../../domain/entities/session.entity.js';
import type { SessionRepository } from '../../domain/repositories/session.repository.js';
import type { TokenHash } from '../../domain/value-objects/token-hash.value-object.js';

import { toDomainSession, toPersistedSession } from './session.mapper.js';

@Injectable()
export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Session | null> {
    const row = await this.prisma.session.findUnique({ where: { id } });
    return row ? toDomainSession(row) : null;
  }

  async findByRefreshTokenHash(hash: TokenHash): Promise<Session | null> {
    const row = await this.prisma.session.findUnique({ where: { refreshTokenHash: hash.toString() } });
    return row ? toDomainSession(row) : null;
  }

  async findAllActiveForCredential(credentialId: string): Promise<Session[]> {
    const rows = await this.prisma.session.findMany({
      where: { credentialId, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    return rows.map(toDomainSession);
  }

  async save(session: Session): Promise<void> {
    const data = toPersistedSession(session);
    await this.prisma.session.upsert({ where: { id: data.id }, create: data, update: data });
  }

  // A single bulk update, not load-all-then-save-each-one -- the whole point
  // is one atomic "kill every session for this credential" operation
  // (reuse detection, password reset, password change without a current
  // session to preserve).
  async revokeAllForCredential(credentialId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { credentialId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
