import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { Country } from '../../domain/entities/country.entity.js';
import { CountryAlreadyExistsError } from '../../domain/exceptions/country-already-exists.error.js';
import type { CountryRepository } from '../../domain/repositories/country.repository.js';

import { toDomainCountry } from './country.mapper.js';

function isUniqueConstraintViolation(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

@Injectable()
export class PrismaCountryRepository implements CountryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Country[]> {
    const rows = await this.prisma.country.findMany({ orderBy: { name: 'asc' } });
    return rows.map(toDomainCountry);
  }

  async findById(id: string): Promise<Country | null> {
    const row = await this.prisma.country.findUnique({ where: { id } });
    return row ? toDomainCountry(row) : null;
  }

  async save(country: Country): Promise<void> {
    const data = {
      id: country.getId(),
      name: country.getName(),
      iso2Code: country.getIso2Code(),
      isActive: country.getIsActive(),
    };

    try {
      await this.prisma.country.upsert({
        where: { id: data.id },
        create: data,
        update: data,
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new CountryAlreadyExistsError(country.getName());
      }
      throw error;
    }
  }
}
