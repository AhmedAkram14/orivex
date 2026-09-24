import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import type { EmailSenderPort } from '../../../authentication/application/ports/email-sender.port.js';
import { toEmailLocale } from '../../../authentication/infrastructure/email/templates/email-locale.js';
import type { GetAppointmentByIdUseCase } from '../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import type { GetDisputeByIdUseCase } from '../../../consultation/application/use-cases/get-dispute-by-id/get-dispute-by-id.use-case.js';
import type { GetDoctorProfileByIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import type { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import type { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { Notification } from '../../domain/entities/notification.entity.js';
import { NotificationEntityType } from '../../domain/enums/notification-entity-type.enum.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

export interface DisputeDismissedEventPayload {
  disputeId: string;
}

// Dispute System Hardening Phase 2: DisputeDismissedEvent previously had no
// subscriber. Deliberately a separate handler from
// NotifyPartiesOfDisputeResolvedHandler (never subscribes to
// 'consultation.dispute.resolved', that one never subscribes to
// 'consultation.dispute.dismissed') -- the two outcomes get different copy,
// matching the Dispute.resolve()'s own "distinct event per distinct fact"
// precedent. Notifies both parties, PHI-light and free of the admin's actual
// resolution notes by construction.
export class NotifyPartiesOfDisputeDismissedHandler {
  constructor(
    private readonly getDisputeByIdUseCase: GetDisputeByIdUseCase,
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
    private readonly getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
    private readonly notificationRepository: NotificationRepository,
    private readonly emailSender: EmailSenderPort,
    private readonly logger: PinoLoggerService,
  ) {}

  async handle(event: DisputeDismissedEventPayload): Promise<void> {
    try {
      const dispute = await this.getDisputeByIdUseCase.execute({ disputeId: event.disputeId });
      if (!dispute) {
        return;
      }

      const appointment = await this.getAppointmentByIdUseCase.execute({ appointmentId: dispute.getAppointmentId() });
      if (!appointment) {
        return;
      }

      const [patientProfile, doctorProfile] = await Promise.all([
        this.getPatientProfileByIdUseCase.execute({ patientProfileId: appointment.getPatientId() }),
        this.getDoctorProfileByIdUseCase.execute({ doctorProfileId: appointment.getDoctorId() }),
      ]);
      if (!patientProfile || !doctorProfile) {
        return;
      }

      const raisedByAccountId = dispute.getRaisedByAccountId();
      const parties = [
        { accountId: patientProfile.getAccountId(), actionUrl: '/patient/disputes' },
        { accountId: doctorProfile.getAccountId(), actionUrl: '/doctor/disputes' },
      ];

      await Promise.all(
        parties.map(async (party) => {
          const isRaiser = party.accountId === raisedByAccountId;
          const description = isRaiser
            ? 'Your dispute has been reviewed and dismissed by an admin. Log in to see the outcome.'
            : 'A dispute involving one of your appointments has been reviewed and dismissed by an admin.';

          const notification = Notification.create({
            accountId: party.accountId,
            title: 'Dispute dismissed',
            description,
            actionUrl: party.actionUrl,
            entityType: NotificationEntityType.Dispute,
            entityId: dispute.getId(),
          });
          await this.notificationRepository.save(notification);

          // I3 -- Notification delivery channels. Reuses AuthenticationModule's
          // own EMAIL_SENDER port, never a second email-sending path.
          // PHI-light by construction -- no resolution notes here.
          const account = await this.getAccountByIdUseCase.execute({ accountId: party.accountId });
          if (account) {
            await this.emailSender.send(
              account.getEmail().toString(),
              'dispute-dismissed',
              {},
              toEmailLocale(account.getUserProfile().getPreferredLanguage()),
            );
          }
        }),
      );
    } catch (error) {
      // A notification failure must never surface back through
      // ResolveDisputeUseCase, which has already saved the dispute by the
      // time domain events dispatch (same tolerance as every other handler
      // in this module).
      this.logger.error(
        'Failed to notify the parties that a dispute was dismissed',
        error instanceof Error ? error.stack : String(error),
        { disputeId: event.disputeId },
      );
    }
  }
}
