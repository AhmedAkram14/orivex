import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import type { EmailSenderPort } from '../../../authentication/application/ports/email-sender.port.js';
import { toEmailLocale } from '../../../authentication/infrastructure/email/templates/email-locale.js';
import type { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import type { NotificationPreferenceGate } from '../services/notification-preference-gate.service.js';

export interface NewDeviceLoginDetectedEventPayload {
  accountId: string;
  displayName: string;
  city: string | undefined;
  country: string | undefined;
}

// Security Center rework -- "email me on a new-device sign-in". Email-only
// (no in-app Notification row): the account may be signing in from a device
// they don't control, so an in-app bell they'd only see after logging in
// again isn't the useful channel here. Gated by the standalone
// emailNewDeviceLogin preference, not a category -- see
// NotificationPreferenceGate.isNewDeviceLoginEmailEnabled()'s comment.
export class NotifyOfNewDeviceLoginHandler {
  constructor(
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
    private readonly emailSender: EmailSenderPort,
    private readonly preferenceGate: NotificationPreferenceGate,
    private readonly logger: PinoLoggerService,
  ) {}

  async handle(event: NewDeviceLoginDetectedEventPayload): Promise<void> {
    try {
      if (!(await this.preferenceGate.isNewDeviceLoginEmailEnabled(event.accountId))) {
        return;
      }

      const account = await this.getAccountByIdUseCase.execute({ accountId: event.accountId });
      if (!account) {
        return;
      }

      const location = [event.city, event.country].filter((part) => part && part.length > 0).join(', ');
      await this.emailSender.send(
        account.getEmail().toString(),
        'new-device-login',
        { displayName: event.displayName, location: location || undefined },
        toEmailLocale(account.getUserProfile().getPreferredLanguage()),
      );
    } catch (error) {
      // A notification failure must never surface back through
      // LoginUseCase, which has already completed the login by the time
      // domain events dispatch (same tolerance as every other handler in
      // this module).
      this.logger.error(
        'Failed to send the new-device-login alert email',
        error instanceof Error ? error.stack : String(error),
        { accountId: event.accountId },
      );
    }
  }
}
