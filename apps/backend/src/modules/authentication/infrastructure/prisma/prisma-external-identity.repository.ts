import { Injectable } from '@nestjs/common';
import { Prisma, type ExternalIdentity as PrismaExternalIdentityRow } from '@prisma/client';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import { ExternalIdentity } from '../../domain/entities/external-identity.entity.js';
import { parseOAuthProvider, type OAuthProvider } from '../../domain/enums/oauth-provider.enum.js';
import { OAuthSignInFailedError, OAuthSignInFailureReason } from '../../domain/exceptions/oauth-sign-in-failed.error.js';
import type { ExternalIdentityRepository } from '../../domain/repositories/external-identity.repository.js';

function toDomainExternalIdentity(row: PrismaExternalIdentityRow): ExternalIdentity {
  const provider = parseOAuthProvider(row.provider);
  if (!provider) {
    throw new Error(`ExternalIdentity ${row.id} has unknown provider "${row.provider}".`);
  }
  return ExternalIdentity.reconstitute({
    id: row.id,
    credentialId: row.credentialId,
    provider,
    providerSubject: row.providerSubject,
    email: row.email ?? undefined,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt,
  });
}

@Injectable()
export class PrismaExternalIdentityRepository implements ExternalIdentityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByProviderSubject(provider: OAuthProvider, providerSubject: string): Promise<ExternalIdentity | null> {
    const row = await this.prisma.externalIdentity.findUnique({
      where: { provider_providerSubject: { provider, providerSubject } },
    });
    return row ? toDomainExternalIdentity(row) : null;
  }

  // Both unique keys can only collide on a race (two concurrent first
  // sign-ins with the same provider account) or when the account already
  // has a *different* account of the same provider linked -- either way the
  // honest answer is "this account is already linked", not a raw 500.
  async save(externalIdentity: ExternalIdentity): Promise<void> {
    const data = {
      id: externalIdentity.getId(),
      credentialId: externalIdentity.getCredentialId(),
      provider: externalIdentity.getProvider(),
      providerSubject: externalIdentity.getProviderSubject(),
      email: externalIdentity.getEmail() ?? null,
      createdAt: externalIdentity.getCreatedAt(),
      lastUsedAt: externalIdentity.getLastUsedAt(),
    };

    try {
      await this.prisma.externalIdentity.upsert({ where: { id: data.id }, create: data, update: data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new OAuthSignInFailedError(OAuthSignInFailureReason.AccountExists);
      }
      throw error;
    }
  }
}
