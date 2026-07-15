import { GetAccountByEmailUseCase } from '../../../../identity/application/use-cases/get-account-by-email/get-account-by-email.use-case.js';
import { RecordSecurityEventCommand } from '../../../../trust/application/use-cases/record-security-event/record-security-event.command.js';
import { RecordSecurityEventUseCase } from '../../../../trust/application/use-cases/record-security-event/record-security-event.use-case.js';
import { SecurityEventType } from '../../../../trust/domain/enums/security-event-type.enum.js';
import { AuthToken } from '../../../domain/entities/auth-token.entity.js';
import { PASSWORD_RESET_TOKEN_TTL_MINUTES } from '../../../domain/constants/authentication.constants.js';
import { TokenPurpose } from '../../../domain/enums/token-purpose.enum.js';
import { PlainToken } from '../../../domain/value-objects/plain-token.value-object.js';
import { TokenHash } from '../../../domain/value-objects/token-hash.value-object.js';
import type { AuthTokenRepository } from '../../../domain/repositories/auth-token.repository.js';
import type { CredentialRepository } from '../../../domain/repositories/credential.repository.js';
import type { EmailSenderPort } from '../../ports/email-sender.port.js';
import type { TokenGeneratorPort } from '../../ports/token-generator.port.js';

import type { ForgotPasswordCommand } from './forgot-password.command.js';

// Always resolves without error, regardless of whether the email matches an
// account — never reveals account existence (matches the frontend's
// ForgotPasswordResponse, which is always { status: 'sent' }).
export class ForgotPasswordUseCase {
  constructor(
    private readonly getAccountByEmailUseCase: GetAccountByEmailUseCase,
    private readonly credentialRepository: CredentialRepository,
    private readonly authTokenRepository: AuthTokenRepository,
    private readonly tokenGenerator: TokenGeneratorPort,
    private readonly emailSender: EmailSenderPort,
    private readonly recordSecurityEventUseCase: RecordSecurityEventUseCase,
  ) {}

  async execute(command: ForgotPasswordCommand): Promise<void> {
    const account = await this.getAccountByEmailUseCase.execute({ email: command.email });
    if (!account) {
      return;
    }

    const credential = await this.credentialRepository.findByAccountId(account.getId().toString());
    if (!credential) {
      return;
    }

    const plainToken = PlainToken.create(this.tokenGenerator.generate());
    const tokenHash = TokenHash.create(this.tokenGenerator.hash(plainToken.toString()));
    const token = AuthToken.issue({
      credentialId: credential.getId(),
      tokenHash,
      purpose: TokenPurpose.PasswordReset,
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MINUTES * 60_000),
    });
    await this.authTokenRepository.save(token);

    await this.emailSender.send(account.getEmail().toString(), 'password-reset', { token: plainToken.toString() });

    await this.recordSecurityEventUseCase.execute(
      new RecordSecurityEventCommand({
        accountId: account.getId().toString(),
        eventType: SecurityEventType.PasswordResetRequested,
      }),
    );
  }
}
