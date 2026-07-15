import { randomUUID } from 'node:crypto';

import { TokenPurpose } from '../enums/token-purpose.enum.js';
import { TokenStatus } from '../enums/token-status.enum.js';
import { TokenInvalidError } from '../exceptions/token-invalid.error.js';
import type { TokenHash } from '../value-objects/token-hash.value-object.js';

export interface IssueAuthTokenProps {
  credentialId: string;
  tokenHash: TokenHash;
  purpose: TokenPurpose;
  expiresAt: Date;
}

export interface ReconstituteAuthTokenProps {
  id: string;
  credentialId: string;
  tokenHash: TokenHash;
  purpose: TokenPurpose;
  status: TokenStatus;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

// Single-use, expiring, hashed-at-rest token for both email verification and
// password reset, disambiguated by purpose — one table/entity rather than
// two near-identical ones.
export class AuthToken {
  private constructor(
    private readonly id: string,
    private readonly credentialId: string,
    private readonly tokenHash: TokenHash,
    private readonly purpose: TokenPurpose,
    private status: TokenStatus,
    private readonly expiresAt: Date,
    private usedAt: Date | undefined,
    private readonly createdAt: Date,
  ) {}

  static issue(props: IssueAuthTokenProps): AuthToken {
    return new AuthToken(
      randomUUID(),
      props.credentialId,
      props.tokenHash,
      props.purpose,
      TokenStatus.Active,
      props.expiresAt,
      undefined,
      new Date(),
    );
  }

  static reconstitute(props: ReconstituteAuthTokenProps): AuthToken {
    return new AuthToken(
      props.id,
      props.credentialId,
      props.tokenHash,
      props.purpose,
      props.status,
      props.expiresAt,
      props.usedAt,
      props.createdAt,
    );
  }

  isValid(now: Date): boolean {
    return this.status === TokenStatus.Active && this.expiresAt > now;
  }

  // Single-use enforcement: a token already used/revoked/expired cannot be
  // marked used again — the caller must check isValid() first, this is the
  // hard backstop against a race between two concurrent uses of the same token.
  markUsed(): void {
    if (this.status !== TokenStatus.Active) {
      throw new TokenInvalidError();
    }
    this.status = TokenStatus.Used;
    this.usedAt = new Date();
  }

  getId(): string {
    return this.id;
  }

  getCredentialId(): string {
    return this.credentialId;
  }

  getTokenHash(): TokenHash {
    return this.tokenHash;
  }

  getPurpose(): TokenPurpose {
    return this.purpose;
  }

  getStatus(): TokenStatus {
    return this.status;
  }

  getExpiresAt(): Date {
    return this.expiresAt;
  }

  getUsedAt(): Date | undefined {
    return this.usedAt;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }
}
