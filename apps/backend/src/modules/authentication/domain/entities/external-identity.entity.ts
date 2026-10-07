import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import type { OAuthProvider } from '../enums/oauth-provider.enum.js';
import { ExternalIdentityLinkedEvent } from '../events/external-identity-linked.event.js';
import { AuthenticationDomainError } from '../exceptions/authentication-domain.error.js';

export interface LinkExternalIdentityProps {
  credentialId: string;
  provider: OAuthProvider;
  providerSubject: string;
  email?: string;
}

export interface ReconstituteExternalIdentityProps {
  id: string;
  credentialId: string;
  provider: OAuthProvider;
  providerSubject: string;
  email?: string;
  createdAt: Date;
  lastUsedAt: Date;
}

// A Google/Facebook account linked to a Credential (docs/14-adrs.md
// ADR-008). Its own small aggregate rather than a child collection on
// Credential: sign-in looks it up by (provider, providerSubject) before any
// Credential is known, and nothing about it ever needs to change atomically
// with the Credential's own lockout/password state.
export class ExternalIdentity {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly id: string,
    private readonly credentialId: string,
    private readonly provider: OAuthProvider,
    private readonly providerSubject: string,
    private readonly email: string | undefined,
    private readonly createdAt: Date,
    private lastUsedAt: Date,
  ) {}

  static link(props: LinkExternalIdentityProps): ExternalIdentity {
    if (!props.providerSubject || props.providerSubject.trim().length === 0) {
      throw new AuthenticationDomainError('ExternalIdentity providerSubject must not be empty.');
    }
    const now = new Date();
    const identity = new ExternalIdentity(
      randomUUID(),
      props.credentialId,
      props.provider,
      props.providerSubject,
      props.email,
      now,
      now,
    );
    identity.record(new ExternalIdentityLinkedEvent(props.credentialId, props.provider));
    return identity;
  }

  static reconstitute(props: ReconstituteExternalIdentityProps): ExternalIdentity {
    return new ExternalIdentity(
      props.id,
      props.credentialId,
      props.provider,
      props.providerSubject,
      props.email,
      props.createdAt,
      props.lastUsedAt,
    );
  }

  recordUse(): void {
    this.lastUsedAt = new Date();
  }

  getId(): string {
    return this.id;
  }

  getCredentialId(): string {
    return this.credentialId;
  }

  getProvider(): OAuthProvider {
    return this.provider;
  }

  getProviderSubject(): string {
    return this.providerSubject;
  }

  getEmail(): string | undefined {
    return this.email;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getLastUsedAt(): Date {
    return this.lastUsedAt;
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
