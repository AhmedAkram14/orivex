import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { AccountRole } from '../../../../identity/domain/enums/account-role.enum.js';
import { RegisterAccountCommand } from '../../../../identity/application/use-cases/register-account/register-account.command.js';
import { RegisterAccountUseCase } from '../../../../identity/application/use-cases/register-account/register-account.use-case.js';
import { Credential } from '../../../domain/entities/credential.entity.js';
import { AuthToken } from '../../../domain/entities/auth-token.entity.js';
import { EMAIL_VERIFICATION_TOKEN_TTL_HOURS } from '../../../domain/constants/authentication.constants.js';
import { TokenPurpose } from '../../../domain/enums/token-purpose.enum.js';
import { PasswordHash } from '../../../domain/value-objects/password-hash.value-object.js';
import { PlainPassword } from '../../../domain/value-objects/plain-password.value-object.js';
import { PlainToken } from '../../../domain/value-objects/plain-token.value-object.js';
import { TokenHash } from '../../../domain/value-objects/token-hash.value-object.js';
import type { AuthTokenRepository } from '../../../domain/repositories/auth-token.repository.js';
import type { CredentialRepository } from '../../../domain/repositories/credential.repository.js';
import type { EmailSenderPort } from '../../ports/email-sender.port.js';
import type { PasswordHasherPort } from '../../ports/password-hasher.port.js';
import type { TokenGeneratorPort } from '../../ports/token-generator.port.js';

import type { RegisterCommand } from './register.command.js';

export interface RegisterResult {
  accountId: string;
  email: string;
}

// Orchestrates Identity's account creation + Authentication's own credential
// creation as two sequential writes, not one cross-module transaction (a
// shared transaction here would violate module encapsulation). If Credential
// creation fails after the Account write succeeds, the flow fails safely
// closed: a Credential-less Account can never pass LoginUseCase's
// findByAccountId check, so it simply can never log in.
export class RegisterUseCase {
  constructor(
    private readonly registerAccountUseCase: RegisterAccountUseCase,
    private readonly credentialRepository: CredentialRepository,
    private readonly authTokenRepository: AuthTokenRepository,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly tokenGenerator: TokenGeneratorPort,
    private readonly emailSender: EmailSenderPort,
    private readonly eventDispatcher: DomainEventDispatcher,
  ) {}

  async execute(command: RegisterCommand): Promise<RegisterResult> {
    const plainPassword = PlainPassword.create(command.password);

    // Self-registration always creates a Patient account; Doctor/Admin roles
    // are provisioned through an administrative/verification flow, never
    // self-service registration (out of this endpoint's scope).
    const account = await this.registerAccountUseCase.execute(
      new RegisterAccountCommand({
        email: command.email,
        role: AccountRole.Patient,
        displayName: command.fullName,
      }),
    );

    const passwordHash = PasswordHash.create(await this.passwordHasher.hash(plainPassword.toString()));
    const credential = Credential.register({ accountId: account.getId().toString(), passwordHash });
    await this.credentialRepository.save(credential);
    await this.eventDispatcher.dispatch(credential.releaseDomainEvents());

    const plainToken = PlainToken.create(this.tokenGenerator.generate());
    const tokenHash = TokenHash.create(this.tokenGenerator.hash(plainToken.toString()));
    const verificationToken = AuthToken.issue({
      credentialId: credential.getId(),
      tokenHash,
      purpose: TokenPurpose.EmailVerification,
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_HOURS * 3_600_000),
    });
    await this.authTokenRepository.save(verificationToken);

    await this.emailSender.send(account.getEmail().toString(), 'email-verification', {
      token: plainToken.toString(),
    });

    return { accountId: account.getId().toString(), email: account.getEmail().toString() };
  }
}
