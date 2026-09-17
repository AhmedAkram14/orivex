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

export interface DisputeRaisedEventPayload {
  disputeId: string;
}

// Dispute System Hardening Phase 2: DisputeRaisedEvent previously had no
// subscriber at all -- a dispute was visible only to whoever raised it, with
// no way for the counterparty (the other party on the underlying
// appointment) to ever learn one existed. Mirrors
// NotifyPatientOfAppointmentExpiredHandler's exact shape. Copy is
// deliberately conduct-neutral -- it never presumes fault, matching this
// handler's role as a pure "something happened, an admin will look at it"
// signal, not an accusation.
export class NotifyCounterpartyOfDisputeRaisedHandler {
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

  async handle(event: DisputeRaisedEventPayload): Promise<void> {
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
      // Whichever of the two isn't the raiser is the counterparty -- the
      // raiser already knows a dispute exists, they just filed it.
      const counterparty = isPatientTheRaiser
        ? { accountId: doctorProfile.getAccountId(), actionUrl: '/doctor/disputes' }
        : { accountId: patientProfile.getAccountId(), actionUrl: '/patient/disputes' };

      const description = 'A dispute was raised about one of your appointments. An admin will review it.';

      const notification = Notification.create({
        accountId: counterparty.accountId,
        title: 'A dispute was raised',
        description,
        actionUrl: counterparty.actionUrl,
      });
      await this.notificationRepository.save(notification);

      // I3 -- Notification delivery channels. Reuses AuthenticationModule's
      // own EMAIL_SENDER port, never a second email-sending path. PHI-light
      // and conduct-neutral by construction -- no reason/category detail,
      // no assignment of fault.
      const account = await this.getAccountByIdUseCase.execute({ accountId: counterparty.accountId });
      if (account) {
        await this.emailSender.send(
          account.getEmail().toString(),
          'dispute-raised',
          {},
          toEmailLocale(account.getUserProfile().getPreferredLanguage()),
        );
      }
    } catch (error) {
      // A notification failure must never surface back through
      // RaiseDisputeUseCase, which has already saved the dispute by the time
      // domain events dispatch (same tolerance as every other handler in
      // this module).
      this.logger.error(
        'Failed to notify the counterparty that a dispute was raised',
        error instanceof Error ? error.stack : String(error),
        { disputeId: event.disputeId },
      );
    }
  }
}
