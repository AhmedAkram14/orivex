import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { Account } from '../../domain/entities/account.entity.js';
import type { AccountRepository } from '../../domain/repositories/account.repository.js';
import type { AccountId } from '../../domain/value-objects/account-id.value-object.js';
import type { EmailAddress } from '../../domain/value-objects/email-address.value-object.js';

import { toDomainAccount, toPersistedAccount } from './account.mapper.js';

@Injectable()
export class PrismaAccountRepository implements AccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: AccountId): Promise<Account | null> {
    const row = await this.prisma.account.findUnique({ where: { id: id.toString() } });
    return row ? toDomainAccount(row) : null;
  }

  async findByEmail(email: EmailAddress): Promise<Account | null> {
    const row = await this.prisma.account.findUnique({ where: { email: email.toString() } });
    return row ? toDomainAccount(row) : null;
  }

  async save(account: Account): Promise<void> {
    const data = toPersistedAccount(account);

    await this.prisma.account.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }
}
