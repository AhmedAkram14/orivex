import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { NotificationPreference } from '../../domain/entities/notification-preference.entity.js';
import type { NotificationPreferenceRepository } from '../../domain/repositories/notification-preference.repository.js';

import { toDomainNotificationPreference, toPersistedNotificationPreference } from './notification-preference.mapper.js';

@Injectable()
export class PrismaNotificationPreferenceRepository implements NotificationPreferenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByAccountId(accountId: string): Promise<NotificationPreference | null> {
    const row = await this.prisma.notificationPreference.findUnique({ where: { accountId } });
    return row ? toDomainNotificationPreference(row) : null;
  }

  // accountId (not id) is the natural key a row may or may not already exist
  // under -- upsert on the DB-unique accountId column, mirroring
  // PrismaDoctorProfileRepository's own upsert-on-unique-owner-column
  // pattern, so a genuine create/update race still resolves safely instead
  // of throwing an unmapped P2002.
  async save(preference: NotificationPreference): Promise<void> {
    const data = toPersistedNotificationPreference(preference);
    await this.prisma.notificationPreference.upsert({
      where: { accountId: data.accountId },
      create: data,
      update: {
        emailAppointments: data.emailAppointments,
        emailBilling: data.emailBilling,
        inAppAppointments: data.inAppAppointments,
        inAppBilling: data.inAppBilling,
        updatedAt: data.updatedAt,
      },
    });
  }
}
