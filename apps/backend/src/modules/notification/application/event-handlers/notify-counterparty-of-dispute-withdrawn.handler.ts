import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import type { EmailSenderPort } from '../../../authentication/application/ports/email-sender.port.js';
import { toEmailLocale } from '../../../authentication/infrastructure/email/templates/email-locale.js';
import type { GetAppointmentByIdUseCase } from '../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import type { GetDisputeByIdUseCase } from '../../../consultation/application/use-cases/get-dispute-by-id/get-dispute-by-id.use-case.js';
import type { GetDoctorProfileByIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import type { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import type { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

export interface DisputeWithdrawnEventPayload {
  disputeId: string;
}

// Dispute System Hardening Phase 2: DisputeWithdrawnEvent previously had no
// subscriber. Notifies only the counterparty -- unlike the raised/resolved/
// dismissed handlers, the raiser already knows (they're the one who
// withdrew it), so this exists purely so the counterparty's own view
// updates without them having to poll. PHI-light and conduct-neutral by
// construction, matching NotifyCounterpartyOfDisputeRaisedHandler's own
// copy discipline.
export class NotifyCounterpartyOfDisputeWithdrawnHandler {
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

  async handle(event: DisputeWithdrawnEventPayload): Promise<void> {
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
      const isPatientTheRaiser = patientProfile.getAccountId() === raisedByAccountId;
      const counterparty = isPatientTheRaiser
        ? { accountId: doctorProfile.getAccountId(), actionUrl: '/doctor/disputes' }
        : { accountId: patientProfile.getAccountId(), actionUrl: '/patient/disputes' };

      const notification = Notification.create({
        accountId: counterparty.accountId,
        title: 'Dispute withdrawn',
        description: 'A dispute involving one of your appointments was withdrawn by the party who raised it.',
        actionUrl: counterparty.actionUrl,
      });
      await this.notificationRepository.save(notification);

      // I3 -- Notification delivery channels. Reuses AuthenticationModule's
      // own EMAIL_SENDER port, never a second email-sending path.
      const account = await this.getAccountByIdUseCase.execute({ accountId: counterparty.accountId });
      if (account) {
        await this.emailSender.send(
          account.getEmail().toString(),
          'dispute-withdrawn',
          {},
          toEmailLocale(account.getUserProfile().getPreferredLanguage()),
        );
      }
    } catch (error) {
      // A notification failure must never surface back through
      // WithdrawDisputeUseCase, which has already saved the dispute by the
      // time domain events dispatch (same tolerance as every other handler
      // in this module).
      this.logger.error(
        'Failed to notify the counterparty that a dispute was withdrawn',
        error instanceof Error ? error.stack : String(error),
        { disputeId: event.disputeId },
      );
    }
  }
}
