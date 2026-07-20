import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { Account } from '../../domain/entities/account.entity.js';
import { AccountAlreadyExistsError } from '../../domain/exceptions/account-already-exists.error.js';
import type {
  AccountRepository,
  ListAccountsOptions,
  ListAccountsResult,
} from '../../domain/repositories/account.repository.js';
import type { AccountId } from '../../domain/value-objects/account-id.value-object.js';
import type { EmailAddress } from '../../domain/value-objects/email-address.value-object.js';

import { toDomainAccount, toPersistedAccount } from './account.mapper.js';

function isUniqueConstraintViolation(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

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

  async findAll(options: ListAccountsOptions): Promise<ListAccountsResult> {
    const where = options.role ? { role: options.role } : {};
    const [rows, total] = await Promise.all([
      this.prisma.account.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit,
        skip: options.offset,
      }),
      this.prisma.account.count({ where }),
    ]);

    return { accounts: rows.map(toDomainAccount), total };
  }

  // RegisterAccountUseCase's own check-then-act uniqueness guard is a
  // fast-fail UX nicety, not the actual guarantee -- two concurrent
  // registrations for the same email can both pass that check before either
  // saves. Account.email is DB-unique, so a genuine race still fails safely
  // here; catching P2002 and translating it to the same domain-level
  // "already exists" outcome closes the gap this would otherwise leave as
  // an unmapped 500.
  async save(account: Account): Promise<void> {
    const data = toPersistedAccount(account);

    try {
      await this.prisma.account.upsert({
        where: { id: data.id },
        create: data,
        update: data,
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new AccountAlreadyExistsError(account.getEmail().toString());
      }
      throw error;
    }
  }
}
