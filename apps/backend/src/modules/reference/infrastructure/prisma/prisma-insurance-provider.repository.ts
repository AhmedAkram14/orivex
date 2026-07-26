import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { InsuranceProvider } from '../../domain/entities/insurance-provider.entity.js';
import { InsuranceProviderAlreadyExistsError } from '../../domain/exceptions/insurance-provider-already-exists.error.js';
import type { InsuranceProviderRepository } from '../../domain/repositories/insurance-provider.repository.js';

import { toDomainInsuranceProvider } from './insurance-provider.mapper.js';

function isUniqueConstraintViolation(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

@Injectable()
export class PrismaInsuranceProviderRepository implements InsuranceProviderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<InsuranceProvider[]> {
    const rows = await this.prisma.insuranceProvider.findMany({ orderBy: { name: 'asc' } });
    return rows.map(toDomainInsuranceProvider);
  }

  async findById(id: string): Promise<InsuranceProvider | null> {
    const row = await this.prisma.insuranceProvider.findUnique({ where: { id } });
    return row ? toDomainInsuranceProvider(row) : null;
  }

  async save(provider: InsuranceProvider): Promise<void> {
    const data = {
      id: provider.getId(),
      name: provider.getName(),
      isActive: provider.getIsActive(),
    };

    try {
      await this.prisma.insuranceProvider.upsert({
        where: { id: data.id },
        create: data,
        update: data,
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new InsuranceProviderAlreadyExistsError(provider.getName());
      }
      throw error;
    }
  }
}
