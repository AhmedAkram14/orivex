import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import type { EmailSenderPort } from '../../../authentication/application/ports/email-sender.port.js';
import { toEmailLocale } from '../../../authentication/infrastructure/email/templates/email-locale.js';
import type { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import type { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

export interface WaitlistOpportunityMatchedEventPayload {
  waitlistEntryId: string;
  patientId: string;
  doctorId: string;
  availabilityWindowId: string;
  scheduledAt: Date;
}

// N8-Waitlist (ORIVEX Remaining Work Audit). NotificationModule reacting to
// WaitlistModule's 'waitlist.opportunity.matched' event by name only,
// mirroring every other handler's cross-module boundary. PHI-light: no
// reason for visit or other clinical detail, matching every other
// notification/email pair in this module.
export class NotifyPatientOfWaitlistOpportunityHandler {
  constructor(
    private readonly getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
    private readonly notificationRepository: NotificationRepository,
    private readonly emailSender: EmailSenderPort,
    private readonly logger: PinoLoggerService,
  ) {}

  async handle(event: WaitlistOpportunityMatchedEventPayload): Promise<void> {
    try {
      const patientProfile = await this.getPatientProfileByIdUseCase.execute({ patientProfileId: event.patientId });
      if (!patientProfile) {
        return;
      }

      const notification = Notification.create({
        accountId: patientProfile.getAccountId(),
        title: 'A slot just opened up',
        description: 'A doctor you were waiting for now has an opening in your requested date range.',
        actionUrl: '/patient/doctors',
      });
      await this.notificationRepository.save(notification);

      const account = await this.getAccountByIdUseCase.execute({ accountId: patientProfile.getAccountId() });
      if (account) {
        await this.emailSender.send(
          account.getEmail().toString(),
          'waitlist-opportunity',
          {},
          toEmailLocale(account.getUserProfile().getPreferredLanguage()),
        );
      }
    } catch (error) {
      // A notification failure must never surface back through
      // MatchAvailabilityWithWaitlistUseCase, which has already claimed and
      // saved the waitlist entry by the time this handler runs (same
      // tolerance as every other handler in this module).
      this.logger.error(
        'Failed to notify the patient of a waitlist opportunity',
        error instanceof Error ? error.stack : String(error),
        { waitlistEntryId: event.waitlistEntryId },
      );
    }
  }
}
