import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import { Department } from '../../domain/entities/department.entity.js';
import { DepartmentAlreadyExistsError } from '../../domain/exceptions/department-already-exists.error.js';
import type { DepartmentRepository } from '../../domain/repositories/department.repository.js';

function isUniqueConstraintViolation(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

@Injectable()
export class PrismaDepartmentRepository implements DepartmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByHospitalId(hospitalId: string): Promise<Department[]> {
    const rows = await this.prisma.department.findMany({ where: { hospitalId }, orderBy: { name: 'asc' } });
    return rows.map((row) =>
      Department.reconstitute({ id: row.id, hospitalId: row.hospitalId, name: row.name, createdAt: row.createdAt }),
    );
  }

  async save(department: Department): Promise<void> {
    const data = {
      id: department.getId(),
      hospitalId: department.getHospitalId(),
      name: department.getName(),
    };

    try {
      await this.prisma.department.upsert({
        where: { id: data.id },
        create: data,
        update: data,
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new DepartmentAlreadyExistsError(department.getHospitalId(), department.getName());
      }
      throw error;
    }
  }
}
