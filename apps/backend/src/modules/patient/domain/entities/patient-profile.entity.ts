import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import { PatientProfileUpdatedEvent } from '../events/patient-profile-updated.event.js';
import { PatientDomainError } from '../exceptions/patient-domain.error.js';

import { EmergencyContact, type EmergencyContactProps } from './emergency-contact.entity.js';

export interface CreatePatientProfileProps {
  accountId: string;
  dateOfBirth?: Date;
  emergencyContacts?: EmergencyContactProps[];
}

export interface UpdatePatientProfileProps {
  dateOfBirth?: Date | null;
  emergencyContacts?: EmergencyContactProps[];
}

export interface ReconstitutePatientProfileProps {
  id: string;
  accountId: string;
  dateOfBirth?: Date;
  emergencyContacts: EmergencyContact[];
  createdAt: Date;
  updatedAt: Date;
}

// Aggregate root of PatientModule (docs/10-backend-architecture.md's
// PatientModule entry: "Owned entities: PatientProfile, EmergencyContact,
// GuardianLink"). GuardianLink is deliberately excluded this sprint --
// its columns/business rules aren't concretely specified anywhere.
// getHealthPassport() (composing a read into the not-yet-built
// ClinicalModule) is likewise out of scope.
export class PatientProfile {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly id: string,
    private readonly accountId: string,
    private dateOfBirth: Date | undefined,
    private emergencyContacts: EmergencyContact[],
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  // Created explicitly via an internal application use case for now
  // (docs/10-backend-architecture.md describes this as an AccountCreated
  // event subscriber "shell" — deferred until the event infrastructure is
  // intentionally expanded in a dedicated infrastructure sprint).
  static create(props: CreatePatientProfileProps): PatientProfile {
    PatientProfile.validateDateOfBirth(props.dateOfBirth);

    const now = new Date();
    const profile = new PatientProfile(
      randomUUID(),
      props.accountId,
      props.dateOfBirth,
      (props.emergencyContacts ?? []).map((contact) => EmergencyContact.create(contact)),
      now,
      now,
    );

    profile.record(new PatientProfileUpdatedEvent(profile.id));
    return profile;
  }

  static reconstitute(props: ReconstitutePatientProfileProps): PatientProfile {
    return new PatientProfile(
      props.id,
      props.accountId,
      props.dateOfBirth,
      props.emergencyContacts,
      props.createdAt,
      props.updatedAt,
    );
  }

  update(props: UpdatePatientProfileProps): void {
    if (props.dateOfBirth !== undefined) {
      PatientProfile.validateDateOfBirth(props.dateOfBirth ?? undefined);
      this.dateOfBirth = props.dateOfBirth ?? undefined;
    }
    if (props.emergencyContacts !== undefined) {
      this.emergencyContacts = props.emergencyContacts.map((contact) => EmergencyContact.create(contact));
    }

    this.updatedAt = new Date();
    this.record(new PatientProfileUpdatedEvent(this.id));
  }

  private static validateDateOfBirth(value: Date | undefined): void {
    if (value !== undefined && value.getTime() > Date.now()) {
      throw new PatientDomainError('dateOfBirth must not be in the future.');
    }
  }

  getId(): string {
    return this.id;
  }

  getAccountId(): string {
    return this.accountId;
  }

  getDateOfBirth(): Date | undefined {
    return this.dateOfBirth;
  }

  getEmergencyContacts(): EmergencyContact[] {
    return this.emergencyContacts;
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
