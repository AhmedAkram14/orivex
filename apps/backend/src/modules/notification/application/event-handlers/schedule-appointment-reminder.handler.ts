import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import type { GetAppointmentByIdUseCase } from '../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import type { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import type { NotificationQueuePort } from '../ports/notification-queue.port.js';

export interface AppointmentBookedEventPayload {
  appointmentId: string;
}

// A reminder fires this long before the appointment's own scheduledAt.
const REMINDER_LEAD_TIME_MS = 24 * 60 * 60 * 1000;

// Plain TypeScript class — no NestJS dependency; subscription wiring lives
// in notification.module.ts only. This is NotificationModule reacting to
// ConsultationModule's already-published AppointmentBookedEvent by name
// only (docs/10-backend-architecture.md's "NotificationModule... consumes
// events from every module"), never importing ConsultationModule's event
// type -- mirrors ClinicalModule's PendingAISuggestionAcknowledgmentHandler
// for the same reason.
export class ScheduleAppointmentReminderHandler {
  constructor(
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
    private readonly getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
    private readonly notificationQueue: NotificationQueuePort,
    private readonly logger: PinoLoggerService,
  ) {}

  async handle(event: AppointmentBookedEventPayload): Promise<void> {
    const appointment = await this.getAppointmentByIdUseCase.execute({ appointmentId: event.appointmentId });
    if (!appointment) {
      return;
    }

    const delayMs = appointment.getScheduledAt().getTime() - REMINDER_LEAD_TIME_MS - Date.now();
    if (delayMs <= 0) {
      // Booked less than 24h before the appointment itself -- there's no
      // lead time left to remind ahead of it; never schedule a reminder
      // that would fire at or after the appointment has already started.
      return;
    }

    const patientProfile = await this.getPatientProfileByIdUseCase.execute({
      patientProfileId: appointment.getPatientId(),
    });
    if (!patientProfile) {
      return;
    }

    try {
      await this.notificationQueue.enqueueAppointmentReminder({
        accountId: patientProfile.getAccountId(),
        appointmentId: appointment.getId(),
        scheduledAt: appointment.getScheduledAt().toISOString(),
        delayMs,
      });
    } catch (error) {
      // A missing/misconfigured queue must never fail the booking request
      // that raised this event -- BookAppointmentUseCase has already saved
      // the appointment by the time domain events dispatch, and
      // InProcessDomainEventDispatcher.dispatch() awaits (and would
      // otherwise propagate) each subscriber in turn.
      this.logger.error(
        'Failed to schedule appointment reminder',
        error instanceof Error ? error.stack : String(error),
        { appointmentId: event.appointmentId },
      );
    }
  }
}
