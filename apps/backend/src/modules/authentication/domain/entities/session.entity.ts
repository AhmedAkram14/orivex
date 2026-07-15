import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import { SessionCreatedEvent } from '../events/session-created.event.js';
import { SessionRevokedEvent } from '../events/session-revoked.event.js';
import type { TokenHash } from '../value-objects/token-hash.value-object.js';

export interface CreateSessionProps {
  credentialId: string;
  refreshTokenHash: TokenHash;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
}

export interface ReconstituteSessionProps {
  id: string;
  credentialId: string;
  refreshTokenHash: TokenHash;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
  revokedAt?: Date;
  lastUsedAt: Date;
  createdAt: Date;
}

// One row = one logical login session AND its current refresh-token
// credential, rotated in place on every /auth/refresh call (never a growing
// history table).
export class Session {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly id: string,
    private readonly credentialId: string,
    private refreshTokenHash: TokenHash,
    private readonly userAgent: string | undefined,
    private readonly ipAddress: string | undefined,
    private expiresAt: Date,
    private revokedAt: Date | undefined,
    private lastUsedAt: Date,
    private readonly createdAt: Date,
  ) {}

  static create(props: CreateSessionProps): Session {
    const now = new Date();
    const session = new Session(
      randomUUID(),
      props.credentialId,
      props.refreshTokenHash,
      props.userAgent,
      props.ipAddress,
      props.expiresAt,
      undefined,
      now,
      now,
    );

    session.record(new SessionCreatedEvent(session.id, session.credentialId));
    return session;
  }

  static reconstitute(props: ReconstituteSessionProps): Session {
    return new Session(
      props.id,
      props.credentialId,
      props.refreshTokenHash,
      props.userAgent,
      props.ipAddress,
      props.expiresAt,
      props.revokedAt,
      props.lastUsedAt,
      props.createdAt,
    );
  }

  isActive(now: Date): boolean {
    return this.revokedAt === undefined && this.expiresAt > now;
  }

  matchesRefreshTokenHash(hash: TokenHash): boolean {
    return this.refreshTokenHash.equals(hash);
  }

  // Rotates the refresh token in place — the whole point of a "current
  // refresh token per session" model instead of a growing token history.
  rotate(newRefreshTokenHash: TokenHash, newExpiresAt: Date): void {
    this.refreshTokenHash = newRefreshTokenHash;
    this.expiresAt = newExpiresAt;
    this.lastUsedAt = new Date();
  }

  // Idempotent: revoking an already-revoked session raises no duplicate
  // event, mirrors Account.suspend()'s idempotency.
  revoke(): void {
    if (this.revokedAt !== undefined) {
      return;
    }
    this.revokedAt = new Date();
    this.record(new SessionRevokedEvent(this.id, this.credentialId));
  }

  getId(): string {
    return this.id;
  }

  getCredentialId(): string {
    return this.credentialId;
  }

  getRefreshTokenHash(): TokenHash {
    return this.refreshTokenHash;
  }

  getUserAgent(): string | undefined {
    return this.userAgent;
  }

  getIpAddress(): string | undefined {
    return this.ipAddress;
  }

  getExpiresAt(): Date {
    return this.expiresAt;
  }

  getRevokedAt(): Date | undefined {
    return this.revokedAt;
  }

  getLastUsedAt(): Date {
    return this.lastUsedAt;
  }

  getCreatedAt(): Date {
    return this.createdAt;
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
