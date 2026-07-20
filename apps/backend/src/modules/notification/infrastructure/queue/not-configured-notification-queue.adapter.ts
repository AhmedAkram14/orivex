import { Injectable } from '@nestjs/common';

import { NotificationDomainError } from '../../domain/exceptions/notification-domain.error.js';
import type { EnqueueAppointmentReminderJob, NotificationQueuePort } from '../../application/ports/notification-queue.port.js';

// Explicit stand-in for the "background job queue" (NotificationModule
// dependency, ORIVEX Roadmap 2.0 Stage 3) -- bound whenever REDIS_URL is
// unset (see notification.module.ts). Performs no queueing logic and
// never fabricates a scheduled reminder; it fails loudly and explicitly
// the moment enqueueAppointmentReminder() is actually invoked, so
// NotificationModule can stay fully wired into the running application
// without silently pretending reminders are scheduled. Mirrors
// NotConfiguredPaymentGatewayAdapter/NotConfiguredRoomTokenAdapter's exact
// idiom -- callers (ScheduleAppointmentReminderHandler) are responsible
// for catching this and logging rather than letting it fail the booking
// request that triggered it.
@Injectable()
export class NotConfiguredNotificationQueueAdapter implements NotificationQueuePort {
  async enqueueAppointmentReminder(_job: EnqueueAppointmentReminderJob): Promise<void> {
    throw new NotificationDomainError(
      'NotificationQueuePort has no configured provider -- REDIS_URL is unset. ' +
        'Appointment reminders cannot be scheduled until a real queue is provisioned.',
    );
  }

  // In practice never called: HealthController only calls
  // checkConnectivity() when REDIS_URL is actually set (reporting
  // "disabled" instead, without a real connectivity check, when it
  // isn't) -- implemented for interface compliance and to fail loudly
  // rather than silently if that assumption is ever wrong.
  async checkConnectivity(): Promise<void> {
    throw new NotificationDomainError(
      'NotificationQueuePort has no configured provider -- REDIS_URL is unset.',
    );
  }
}
