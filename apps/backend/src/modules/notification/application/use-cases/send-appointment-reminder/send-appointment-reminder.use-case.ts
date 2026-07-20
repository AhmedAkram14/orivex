import type { GetAccountByIdUseCase } from '../../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import type { EmailSenderPort } from '../../../../authentication/application/ports/email-sender.port.js';
import { Notification } from '../../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../../domain/repositories/notification.repository.js';

import type { SendAppointmentReminderCommand } from './send-appointment-reminder.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// notification.module.ts only (ORIVEX Roadmap 2.0 Stage 3). The BullMQ
// worker's job processor for the delayed reminder job
// ScheduleAppointmentReminderHandler enqueues -- this is Notification.
// create()'s first real producer (previously real but never called from
// outside the domain layer itself).
export class SendAppointmentReminderUseCase {
  constructor(
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
    private readonly notificationRepository: NotificationRepository,
    private readonly emailSender: EmailSenderPort,
  ) {}

  async execute(command: SendAppointmentReminderCommand): Promise<void> {
    const account = await this.getAccountByIdUseCase.execute({ accountId: command.accountId });
    if (!account) {
      // Account deleted/suspended in the ~24h since this job was scheduled
      // -- nothing left to remind, and never an error worth failing the
      // job over.
      return;
    }

    const notification = Notification.create({
      accountId: command.accountId,
      title: 'Upcoming appointment reminder',
      description: `You have an upcoming appointment scheduled for ${command.scheduledAt}.`,
    });
    await this.notificationRepository.save(notification);

    await this.emailSender.send(account.getEmail().toString(), 'appointment-reminder', {
      scheduledAt: command.scheduledAt,
    });
  }
}
