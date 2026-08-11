import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import { MedicalSpecialtyAlreadyExistsError } from '../../domain/exceptions/medical-specialty-already-exists.error.js';
import type { MedicalSpecialty } from '../../domain/entities/medical-specialty.entity.js';
import type { MedicalSpecialtyRepository } from '../../domain/repositories/medical-specialty.repository.js';

import { toDomainMedicalSpecialty } from './medical-specialty.mapper.js';

function isUniqueConstraintViolation(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

@Injectable()
export class PrismaMedicalSpecialtyRepository implements MedicalSpecialtyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<MedicalSpecialty[]> {
    const rows = await this.prisma.medicalSpecialty.findMany({ orderBy: { name: 'asc' } });
    return rows.map(toDomainMedicalSpecialty);
  }

  async findById(id: string): Promise<MedicalSpecialty | null> {
    const row = await this.prisma.medicalSpecialty.findUnique({ where: { id } });
    return row ? toDomainMedicalSpecialty(row) : null;
  }

  async save(specialty: MedicalSpecialty): Promise<void> {
    const data = {
      id: specialty.getId(),
      name: specialty.getName(),
      nameAr: specialty.getNameAr() ?? null,
      isActive: specialty.getIsActive(),
    };

    try {
      await this.prisma.medicalSpecialty.upsert({
        where: { id: data.id },
        create: data,
        update: data,
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new MedicalSpecialtyAlreadyExistsError(specialty.getName());
      }
      throw error;
    }
  }
}
