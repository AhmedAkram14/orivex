import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import { LOCKOUT_DURATION_MINUTES, MAX_FAILED_LOGIN_ATTEMPTS } from '../constants/authentication.constants.js';
import { CredentialStatus } from '../enums/credential-status.enum.js';
import { AccountLockedEvent } from '../events/account-locked.event.js';
import { CredentialCreatedEvent } from '../events/credential-created.event.js';
import { LoginFailedEvent } from '../events/login-failed.event.js';
import { LoginSucceededEvent } from '../events/login-succeeded.event.js';
import { PasswordChangedEvent } from '../events/password-changed.event.js';
import type { PasswordHash } from '../value-objects/password-hash.value-object.js';

export interface RegisterCredentialProps {
  accountId: string;
  passwordHash: PasswordHash;
}

// Social Sign-In (docs/14-adrs.md ADR-008): a Credential created through
// Google/Facebook rather than /auth/register -- no password yet. The email
// counts as verified only when the provider itself asserts it is.
export interface RegisterExternalCredentialProps {
  accountId: string;
  emailVerified: boolean;
}

export interface ReconstituteCredentialProps {
  id: string;
  accountId: string;
  passwordHash?: PasswordHash;
  status: CredentialStatus;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  emailVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// AuthenticationModule's own aggregate root for credential verification —
// deliberately separate from Identity's Account (Identity keeps owning
// Account/Profile/Roles; Authentication owns how a person proves they are
// that Account). Linked to an Account by id only.
export class Credential {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly id: string,
    private readonly accountId: string,
    private passwordHash: PasswordHash | undefined,
    private status: CredentialStatus,
    private failedLoginAttempts: number,
    private lockedUntil: Date | undefined,
    private emailVerifiedAt: Date | undefined,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static register(props: RegisterCredentialProps): Credential {
    const now = new Date();
    const credential = new Credential(
      randomUUID(),
      props.accountId,
      props.passwordHash,
      CredentialStatus.Active,
      0,
      undefined,
      undefined,
      now,
      now,
    );

    credential.record(new CredentialCreatedEvent(credential.accountId));
    return credential;
  }

  static registerExternal(props: RegisterExternalCredentialProps): Credential {
    const now = new Date();
    const credential = new Credential(
      randomUUID(),
      props.accountId,
      undefined,
      CredentialStatus.Active,
      0,
      undefined,
      props.emailVerified ? now : undefined,
      now,
      now,
    );

    credential.record(new CredentialCreatedEvent(credential.accountId));
    return credential;
  }

  static reconstitute(props: ReconstituteCredentialProps): Credential {
    return new Credential(
      props.id,
      props.accountId,
      props.passwordHash,
      props.status,
      props.failedLoginAttempts,
      props.lockedUntil,
      props.emailVerifiedAt,
      props.createdAt,
      props.updatedAt,
    );
  }

  // Time-based check, not status-based: once lockedUntil has passed, the
  // credential is usable again even though `status` still reads LOCKED in
  // storage until the next recordSuccessfulLogin() clears it.
  isLocked(now: Date): boolean {
    return this.status === CredentialStatus.Locked && this.lockedUntil !== undefined && this.lockedUntil > now;
  }

  isEmailVerified(): boolean {
    return this.emailVerifiedAt !== undefined;
  }

  hasPassword(): boolean {
    return this.passwordHash !== undefined;
  }

  matchesPasswordHash(hash: PasswordHash): boolean {
    return this.passwordHash !== undefined && this.passwordHash.toString() === hash.toString();
  }

  // Increments the failure counter and locks the credential once the
  // threshold is reached. Raises LoginFailed always, and additionally
  // AccountLocked the moment the threshold is crossed.
  recordFailedLogin(): void {
    this.failedLoginAttempts += 1;
    this.updatedAt = new Date();
    this.record(new LoginFailedEvent(this.accountId));

    if (this.failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      this.status = CredentialStatus.Locked;
      this.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60_000);
      this.record(new AccountLockedEvent(this.accountId, this.lockedUntil));
    }
  }

  recordSuccessfulLogin(): void {
    this.failedLoginAttempts = 0;
    this.lockedUntil = undefined;
    this.status = CredentialStatus.Active;
    this.updatedAt = new Date();
    this.record(new LoginSucceededEvent(this.accountId));
  }

  changePassword(newPasswordHash: PasswordHash): void {
    this.passwordHash = newPasswordHash;
    this.updatedAt = new Date();
    this.record(new PasswordChangedEvent(this.accountId));
  }

  // Social Sign-In linking (docs/14-adrs.md ADR-008): a provider has just
  // proven ownership of this account's email. If the email was never
  // verified here, whoever set the existing password never proved they own
  // the address -- it could be someone who pre-registered a victim's email
  // ahead of them -- so that password is discarded rather than inherited
  // (the owner can set a new one through forgot-password). Returns whether
  // it was discarded, so the caller also revokes any sessions it opened.
  confirmEmailOwnershipThroughProvider(): boolean {
    if (this.emailVerifiedAt !== undefined) {
      return false;
    }
    const discardedPassword = this.passwordHash !== undefined;
    this.passwordHash = undefined;
    this.emailVerifiedAt = new Date();
    this.updatedAt = new Date();
    return discardedPassword;
  }

  verifyEmail(): void {
    if (this.emailVerifiedAt !== undefined) {
      return;
    }
    this.emailVerifiedAt = new Date();
    this.updatedAt = new Date();
  }

  getId(): string {
    return this.id;
  }

  getAccountId(): string {
    return this.accountId;
  }

  getPasswordHash(): PasswordHash | undefined {
    return this.passwordHash;
  }

  getStatus(): CredentialStatus {
    return this.status;
  }

  getFailedLoginAttempts(): number {
    return this.failedLoginAttempts;
  }

  getLockedUntil(): Date | undefined {
    return this.lockedUntil;
  }

  getEmailVerifiedAt(): Date | undefined {
    return this.emailVerifiedAt;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  releaseDomainEvents(): DomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents.length = 0;
    return events;
  }

  private record(event: DomainEvent): void {
    this.domainEvents.push(event);
  }
}
