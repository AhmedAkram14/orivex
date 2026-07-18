import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

import { toDomainNotification, toPersistedNotification } from './notification.mapper.js';

@Injectable()
export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Notification | null> {
    const row = await this.prisma.notification.findUnique({ where: { id } });
    return row ? toDomainNotification(row) : null;
  }

  async findByAccountId(accountId: string): Promise<Notification[]> {
    const rows = await this.prisma.notification.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toDomainNotification);
  }

  async findByAccountIdPage(accountId: string, skip: number, take: number): Promise<Notification[]> {
    const rows = await this.prisma.notification.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
    return rows.map(toDomainNotification);
  }

  async countByAccountId(accountId: string): Promise<number> {
    return this.prisma.notification.count({ where: { accountId } });
  }

  async save(notification: Notification): Promise<void> {
    const data = toPersistedNotification(notification);
    await this.prisma.notification.upsert({
      where: { id: data.id },
      create: data,
      update: { read: data.read },
    });
  }
}
