import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { Holiday } from '../../domain/entities/holiday.entity.js';
import type { HolidayRepository } from '../../domain/repositories/holiday.repository.js';

import { toDomainHoliday } from './holiday.mapper.js';

@Injectable()
export class PrismaHolidayRepository implements HolidayRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Holiday[]> {
    const rows = await this.prisma.holiday.findMany({ orderBy: { date: 'asc' } });
    return rows.map(toDomainHoliday);
  }
}
