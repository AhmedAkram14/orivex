import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import { AccountRole } from '../enums/account-role.enum.js';
import { AccountStatus } from '../enums/account-status.enum.js';
import { Language } from '../enums/language.enum.js';
import { AccountCreatedEvent } from '../events/account-created.event.js';
import { AccountSuspendedEvent } from '../events/account-suspended.event.js';
import { AccountClosedError } from '../exceptions/account-closed.error.js';
import { AccountId } from '../value-objects/account-id.value-object.js';
import type { DisplayName } from '../value-objects/display-name.value-object.js';
import type { EmailAddress } from '../value-objects/email-address.value-object.js';

import { UserProfile } from './user-profile.entity.js';

export interface RegisterAccountProps {
  email: EmailAddress;
  role: AccountRole;
  displayName: DisplayName;
  preferredLanguage?: Language;
}

export interface ReconstituteAccountProps {
  id: AccountId;
  email: EmailAddress;
  role: AccountRole;
  status: AccountStatus;
  userProfile: UserProfile;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateProfileProps {
  displayName?: DisplayName;
  phoneNumber?: string;
  preferredLanguage?: Language;
}

// Aggregate root of the Identity & Access bounded context (docs/10-backend-
// architecture.md). Owns Account + UserProfile as one transactional unit.
// Credential verification, tokens, and sessions belong to AuthenticationModule
// (a distinct bounded context), which links to an Account by id only.
export class Account {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly id: AccountId,
    private readonly email: EmailAddress,
    private role: AccountRole,
    private status: AccountStatus,
    private readonly userProfile: UserProfile,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  // Registers a brand-new Account. Raises AccountCreated.
  static register(props: RegisterAccountProps): Account {
    const now = new Date();
    const account = new Account(
      AccountId.create(randomUUID()),
      props.email,
      props.role,
      AccountStatus.Active,
      UserProfile.create({
        displayName: props.displayName,
        preferredLanguage: props.preferredLanguage ?? Language.Arabic,
      }),
      now,
      now,
    );

    account.record(new AccountCreatedEvent(account.id.toString(), account.email.toString()));
    return account;
  }

  // Rehydrates an Account from persisted state. No events raised — this is
  // not a state change, just loading existing state (future repository's job).
  static reconstitute(props: ReconstituteAccountProps): Account {
    return new Account(
      props.id,
      props.email,
      props.role,
      props.status,
      props.userProfile,
      props.createdAt,
      props.updatedAt,
    );
  }

  // Suspends the account. Raises AccountSuspended. A closed account is
  // terminal and cannot be suspended.
  suspend(): void {
    if (this.status === AccountStatus.Suspended) {
      return;
    }
    if (this.status === AccountStatus.Closed) {
      throw new AccountClosedError(this.id.toString());
    }

    this.status = AccountStatus.Suspended;
    this.updatedAt = new Date();
    this.record(new AccountSuspendedEvent(this.id.toString()));
  }

  // Updates UserProfile fields through the aggregate root — UserProfile is
  // never mutated directly from outside Account.
  updateProfile(props: UpdateProfileProps): void {
    if (props.displayName) {
      this.userProfile.updateDisplayName(props.displayName);
    }
    if (props.phoneNumber !== undefined) {
      this.userProfile.updatePhoneNumber(props.phoneNumber);
    }
    if (props.preferredLanguage) {
      this.userProfile.updatePreferredLanguage(props.preferredLanguage);
    }
    this.updatedAt = new Date();
  }

  getId(): AccountId {
    return this.id;
  }

  getEmail(): EmailAddress {
    return this.email;
  }

  getRole(): AccountRole {
    return this.role;
  }

  getStatus(): AccountStatus {
    return this.status;
  }

  getUserProfile(): UserProfile {
    return this.userProfile;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  // Drains recorded events for the (future) application layer to dispatch
  // after a successful persistence write.
  releaseDomainEvents(): DomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents.length = 0;
    return events;
  }

  private record(event: DomainEvent): void {
    this.domainEvents.push(event);
  }
}
