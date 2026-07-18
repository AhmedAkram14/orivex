import { GetAccountByEmailUseCase } from '../../../../identity/application/use-cases/get-account-by-email/get-account-by-email.use-case.js';
import { AuthToken } from '../../../domain/entities/auth-token.entity.js';
import { EMAIL_VERIFICATION_TOKEN_TTL_HOURS } from '../../../domain/constants/authentication.constants.js';
import { TokenPurpose } from '../../../domain/enums/token-purpose.enum.js';
import { PlainToken } from '../../../domain/value-objects/plain-token.value-object.js';
import { TokenHash } from '../../../domain/value-objects/token-hash.value-object.js';
import type { AuthTokenRepository } from '../../../domain/repositories/auth-token.repository.js';
import type { CredentialRepository } from '../../../domain/repositories/credential.repository.js';
import type { EmailSenderPort } from '../../ports/email-sender.port.js';
import type { TokenGeneratorPort } from '../../ports/token-generator.port.js';

import type { ResendVerificationCommand } from './resend-verification.command.js';

// Always resolves without error, regardless of whether the email matches an
// account or is already verified — never reveals account existence, same
// posture as ForgotPasswordUseCase (matches the frontend's
// ResendVerificationResponse, which is always { status: 'sent' }).
export class ResendVerificationUseCase {
  constructor(
    private readonly getAccountByEmailUseCase: GetAccountByEmailUseCase,
    private readonly credentialRepository: CredentialRepository,
    private readonly authTokenRepository: AuthTokenRepository,
    private readonly tokenGenerator: TokenGeneratorPort,
    private readonly emailSender: EmailSenderPort,
  ) {}

  async execute(command: ResendVerificationCommand): Promise<void> {
    const account = await this.getAccountByEmailUseCase.execute({ email: command.email });
    if (!account) {
      return;
    }

    const credential = await this.credentialRepository.findByAccountId(account.getId().toString());
    if (!credential || credential.isEmailVerified()) {
      return;
    }

    const plainToken = PlainToken.create(this.tokenGenerator.generate());
    const tokenHash = TokenHash.create(this.tokenGenerator.hash(plainToken.toString()));
    const token = AuthToken.issue({
      credentialId: credential.getId(),
      tokenHash,
      purpose: TokenPurpose.EmailVerification,
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_HOURS * 3_600_000),
    });
    await this.authTokenRepository.save(token);

    await this.emailSender.send(account.getEmail().toString(), 'email-verification', {
      token: plainToken.toString(),
    });
  }
}
