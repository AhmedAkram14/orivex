import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import type { Account } from '../../../../identity/domain/entities/account.entity.js';
import { AccountRole } from '../../../../identity/domain/enums/account-role.enum.js';
import { MAX_DISPLAY_NAME_LENGTH } from '../../../../identity/domain/constants/identity.constants.js';
import { GetAccountByEmailUseCase } from '../../../../identity/application/use-cases/get-account-by-email/get-account-by-email.use-case.js';
import { GetAccountByIdUseCase } from '../../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { RegisterAccountCommand } from '../../../../identity/application/use-cases/register-account/register-account.command.js';
import { RegisterAccountUseCase } from '../../../../identity/application/use-cases/register-account/register-account.use-case.js';
import { RecordSecurityEventCommand } from '../../../../trust/application/use-cases/record-security-event/record-security-event.command.js';
import { RecordSecurityEventUseCase } from '../../../../trust/application/use-cases/record-security-event/record-security-event.use-case.js';
import { SecurityEventType } from '../../../../trust/domain/enums/security-event-type.enum.js';
import { EMAIL_VERIFICATION_TOKEN_TTL_HOURS } from '../../../domain/constants/authentication.constants.js';
import { AuthToken } from '../../../domain/entities/auth-token.entity.js';
import { Credential } from '../../../domain/entities/credential.entity.js';
import { ExternalIdentity } from '../../../domain/entities/external-identity.entity.js';
import { LoginFailureReason } from '../../../domain/enums/login-failure-reason.enum.js';
import { TokenPurpose } from '../../../domain/enums/token-purpose.enum.js';
import { AccountLockedError } from '../../../domain/exceptions/account-locked.error.js';
import { EmailNotVerifiedError } from '../../../domain/exceptions/email-not-verified.error.js';
import { InvalidCredentialsError } from '../../../domain/exceptions/invalid-credentials.error.js';
import { OAuthProviderNotConfiguredError } from '../../../domain/exceptions/oauth-provider-not-configured.error.js';
import { OAuthSignInFailedError, OAuthSignInFailureReason } from '../../../domain/exceptions/oauth-sign-in-failed.error.js';
import type { AuthTokenRepository } from '../../../domain/repositories/auth-token.repository.js';
import type { CredentialRepository } from '../../../domain/repositories/credential.repository.js';
import type { ExternalIdentityRepository } from '../../../domain/repositories/external-identity.repository.js';
import type { SessionRepository } from '../../../domain/repositories/session.repository.js';
import { PlainToken } from '../../../domain/value-objects/plain-token.value-object.js';
import { TokenHash } from '../../../domain/value-objects/token-hash.value-object.js';
import { toEmailLocale } from '../../../infrastructure/email/templates/email-locale.js';
import type { EmailSenderPort } from '../../ports/email-sender.port.js';
import type { JwtSignerPort } from '../../ports/jwt-signer.port.js';
import type { OAuthProfile, OAuthProviderRegistryPort } from '../../ports/oauth-provider.port.js';
import type { TokenGeneratorPort } from '../../ports/token-generator.port.js';
import { issueSessionAfterSuccessfulLogin, type IssuedSession } from '../../services/issue-session.js';

import type { CompleteOAuthSignInCommand } from './complete-oauth-sign-in.command.js';

export type CompleteOAuthSignInResult =
  | ({ status: 'signed_in'; account: Account } & IssuedSession)
  // A brand-new account whose provider doesn't vouch for the email
  // (Facebook): a verification link was emailed, exactly like
  // /auth/register, and no session exists until it is used.
  | { status: 'verification_required'; email: string };

interface ResolvedSignIn {
  account: Account;
  credential: Credential;
  isNewAccount: boolean;
}

// Step 2 of Social Sign-In (docs/14-adrs.md ADR-008), run on the provider's
// redirect back. Resolution order:
//   1. An ExternalIdentity already linked to this provider account -> sign
//      in as its Credential's account (matched on the provider's stable
//      subject id, never on email).
//   2. Otherwise an existing account with the same email -> link to it, but
//      only when the provider asserts the email is verified; otherwise
//      refuse (AccountExists), since linking on an unverified address would
//      hand the account to whoever controls the provider profile.
//   3. Otherwise a new Patient account (same rule as /auth/register:
//      Doctor/Admin are never self-service).
// Then the same lockout / email-verification gates as LoginUseCase, and the
// same session issuance (issueSessionAfterSuccessfulLogin).
//
// Like RegisterUseCase, Identity's account write and this module's own
// writes are sequential, not one cross-module transaction; a failure part
// way leaves either a Credential-less Account (can never sign in, fails
// closed) or a Credential without an ExternalIdentity (the next attempt
// takes branch 2 and links it).
export class CompleteOAuthSignInUseCase {
  constructor(
    private readonly providerRegistry: OAuthProviderRegistryPort,
    private readonly externalIdentityRepository: ExternalIdentityRepository,
    private readonly credentialRepository: CredentialRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly authTokenRepository: AuthTokenRepository,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
    private readonly getAccountByEmailUseCase: GetAccountByEmailUseCase,
    private readonly registerAccountUseCase: RegisterAccountUseCase,
    private readonly tokenGenerator: TokenGeneratorPort,
    private readonly jwtSigner: JwtSignerPort,
    private readonly emailSender: EmailSenderPort,
    private readonly recordSecurityEventUseCase: RecordSecurityEventUseCase,
    private readonly eventDispatcher: DomainEventDispatcher,
    // Same env-gated bypass LoginUseCase honors (SKIP_EMAIL_VERIFICATION).
    private readonly skipEmailVerification: boolean = false,
  ) {}

  async execute(command: CompleteOAuthSignInCommand): Promise<CompleteOAuthSignInResult> {
    const client = this.providerRegistry.get(command.provider);
    if (!client) {
      throw new OAuthProviderNotConfiguredError(command.provider);
    }

    const profile = await client.exchangeCode({ code: command.code, codeVerifier: command.codeVerifier });
    const { account, credential, isNewAccount } = await this.resolve(profile, command);

    if (credential.isLocked(new Date())) {
      await this.recordSecurityEventUseCase.execute(
        new RecordSecurityEventCommand({
          accountId: account.getId().toString(),
          eventType: SecurityEventType.AccountLocked,
          ipAddress: command.ipAddress,
          userAgent: command.userAgent,
          metadata: { reason: LoginFailureReason.Locked, method: command.provider },
        }),
      );
      throw new AccountLockedError(credential.getLockedUntil() as Date);
    }

    if (!this.skipEmailVerification && !credential.isEmailVerified()) {
      if (isNewAccount) {
        await this.sendVerificationEmail(account, credential);
        return { status: 'verification_required', email: account.getEmail().toString() };
      }
      throw new EmailNotVerifiedError();
    }

    const issued = await issueSessionAfterSuccessfulLogin(
      {
        credentialRepository: this.credentialRepository,
        sessionRepository: this.sessionRepository,
        tokenGenerator: this.tokenGenerator,
        jwtSigner: this.jwtSigner,
        recordSecurityEventUseCase: this.recordSecurityEventUseCase,
        eventDispatcher: this.eventDispatcher,
      },
      {
        account,
        credential,
        ipAddress: command.ipAddress,
        userAgent: command.userAgent,
        securityEventMetadata: { method: command.provider },
      },
    );

    return { status: 'signed_in', account, ...issued };
  }

  private async resolve(profile: OAuthProfile, command: CompleteOAuthSignInCommand): Promise<ResolvedSignIn> {
    const linked = await this.externalIdentityRepository.findByProviderSubject(profile.provider, profile.subject);
    if (linked) {
      const credential = await this.credentialRepository.findById(linked.getCredentialId());
      const account = credential
        ? await this.getAccountByIdUseCase.execute({ accountId: credential.getAccountId() })
        : null;
      if (!credential || !account) {
        throw new InvalidCredentialsError();
      }
      linked.recordUse();
      await this.externalIdentityRepository.save(linked);
      return { account, credential, isNewAccount: false };
    }

    if (!profile.email) {
      throw new OAuthSignInFailedError(OAuthSignInFailureReason.EmailMissing);
    }

    const existingAccount = await this.getAccountByEmailUseCase.execute({ email: profile.email });
    if (existingAccount) {
      if (!profile.emailVerified) {
        throw new OAuthSignInFailedError(OAuthSignInFailureReason.AccountExists);
      }
      const credential = await this.claimExistingAccount(existingAccount);
      await this.link(credential, profile);
      return { account: existingAccount, credential, isNewAccount: false };
    }

    const account = await this.registerAccountUseCase.execute(
      new RegisterAccountCommand({
        email: profile.email,
        role: AccountRole.Patient,
        displayName: displayNameFor(profile, profile.email),
        preferredLanguage: command.preferredLanguage,
      }),
    );
    const credential = Credential.registerExternal({
      accountId: account.getId().toString(),
      emailVerified: profile.emailVerified,
    });
    await this.credentialRepository.save(credential);
    await this.eventDispatcher.dispatch(credential.releaseDomainEvents());
    await this.link(credential, profile);
    return { account, credential, isNewAccount: true };
  }

  // Linking to an existing account on a provider-verified email. See
  // Credential.confirmEmailOwnershipThroughProvider for why an unverified
  // account's password (and any session it opened) doesn't survive this.
  private async claimExistingAccount(account: Account): Promise<Credential> {
    const accountId = account.getId().toString();
    const existing = await this.credentialRepository.findByAccountId(accountId);
    if (!existing) {
      const credential = Credential.registerExternal({ accountId, emailVerified: true });
      await this.credentialRepository.save(credential);
      await this.eventDispatcher.dispatch(credential.releaseDomainEvents());
      return credential;
    }

    if (existing.confirmEmailOwnershipThroughProvider()) {
      await this.sessionRepository.revokeAllForCredential(existing.getId());
    }
    await this.credentialRepository.save(existing);
    return existing;
  }

  private async link(credential: Credential, profile: OAuthProfile): Promise<void> {
    const identity = ExternalIdentity.link({
      credentialId: credential.getId(),
      provider: profile.provider,
      providerSubject: profile.subject,
      email: profile.email,
    });
    await this.externalIdentityRepository.save(identity);
    await this.eventDispatcher.dispatch(identity.releaseDomainEvents());
  }

  // Same token + email RegisterUseCase sends.
  private async sendVerificationEmail(account: Account, credential: Credential): Promise<void> {
    const plainToken = PlainToken.create(this.tokenGenerator.generate());
    const tokenHash = TokenHash.create(this.tokenGenerator.hash(plainToken.toString()));
    const verificationToken = AuthToken.issue({
      credentialId: credential.getId(),
      tokenHash,
      purpose: TokenPurpose.EmailVerification,
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_HOURS * 3_600_000),
    });
    await this.authTokenRepository.save(verificationToken);

    await this.emailSender.send(
      account.getEmail().toString(),
      'email-verification',
      { token: plainToken.toString() },
      toEmailLocale(account.getUserProfile().getPreferredLanguage()),
    );
  }
}

// The provider's own name for the person, falling back to the email's local
// part -- never empty, never over Identity's DisplayName limit.
function displayNameFor(profile: OAuthProfile, email: string): string {
  const name = profile.displayName?.trim() || email.split('@')[0] || email;
  return name.slice(0, MAX_DISPLAY_NAME_LENGTH);
}
