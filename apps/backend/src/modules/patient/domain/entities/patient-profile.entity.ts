import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import { PatientProfileUpdatedEvent } from '../events/patient-profile-updated.event.js';
import type { BloodType } from '../enums/blood-type.enum.js';

import { EmergencyContact, type EmergencyContactProps } from './emergency-contact.entity.js';

export interface CreatePatientProfileProps {
  accountId: string;
  emergencyContacts?: EmergencyContactProps[];
}

export interface UpdatePatientProfileProps {
  emergencyContacts?: EmergencyContactProps[];
  // Onboarding Redesign (2026-07-21 proposal, Stage O.3): Patient's own
  // medical-profile fields -- deliberately unstructured free text for
  // allergies/chronicDiseases (finalized in the approved proposal: no ICD-11/
  // SNOMED CT, no reference tables, for this phase).
  bloodType?: BloodType | null;
  allergies?: string | null;
  chronicDiseases?: string | null;
  insuranceProviderId?: string | null;
}

export interface ReconstitutePatientProfileProps {
  id: string;
  accountId: string;
  emergencyContacts: EmergencyContact[];
  createdAt: Date;
  updatedAt: Date;
  bloodType?: BloodType;
  allergies?: string;
  chronicDiseases?: string;
  insuranceProviderId?: string;
}

// Aggregate root of PatientModule (docs/10-backend-architecture.md's
// PatientModule entry: "Owned entities: PatientProfile, EmergencyContact,
// GuardianLink"). GuardianLink is deliberately excluded this sprint --
// its columns/business rules aren't concretely specified anywhere.
// getHealthPassport() (composing a read into the not-yet-built
// ClinicalModule) is likewise out of scope.
//
// dateOfBirth moved to Account/UserProfile (Onboarding Redesign, 2026-07-21
// proposal §0a) -- Identity is the single owner of cross-role personal
// info; PatientProfile owns patient-specific medical information only.
export class PatientProfile {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly id: string,
    private readonly accountId: string,
    private emergencyContacts: EmergencyContact[],
    private readonly createdAt: Date,
    private updatedAt: Date,
    private bloodType: BloodType | undefined,
    private allergies: string | undefined,
    private chronicDiseases: string | undefined,
    private insuranceProviderId: string | undefined,
  ) {}

  // Created explicitly via an internal application use case for now
  // (docs/10-backend-architecture.md describes this as an AccountCreated
  // event subscriber "shell" — deferred until the event infrastructure is
  // intentionally expanded in a dedicated infrastructure sprint).
  static create(props: CreatePatientProfileProps): PatientProfile {
    const now = new Date();
    const profile = new PatientProfile(
      randomUUID(),
      props.accountId,
      (props.emergencyContacts ?? []).map((contact) => EmergencyContact.create(contact)),
      now,
      now,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    profile.record(new PatientProfileUpdatedEvent(profile.id));
    return profile;
  }

  static reconstitute(props: ReconstitutePatientProfileProps): PatientProfile {
    return new PatientProfile(
      props.id,
      props.accountId,
      props.emergencyContacts,
      props.createdAt,
      props.updatedAt,
      props.bloodType,
      props.allergies,
      props.chronicDiseases,
      props.insuranceProviderId,
    );
  }

  update(props: UpdatePatientProfileProps): void {
    if (props.emergencyContacts !== undefined) {
      this.emergencyContacts = props.emergencyContacts.map((contact) => EmergencyContact.create(contact));
    }
    if (props.bloodType !== undefined) {
      this.bloodType = props.bloodType ?? undefined;
    }
    if (props.allergies !== undefined) {
      this.allergies = props.allergies ?? undefined;
    }
    if (props.chronicDiseases !== undefined) {
      this.chronicDiseases = props.chronicDiseases ?? undefined;
    }
    if (props.insuranceProviderId !== undefined) {
      this.insuranceProviderId = props.insuranceProviderId ?? undefined;
    }

    this.updatedAt = new Date();
    this.record(new PatientProfileUpdatedEvent(this.id));
  }

  getId(): string {
    return this.id;
  }

  getAccountId(): string {
    return this.accountId;
  }

  getEmergencyContacts(): EmergencyContact[] {
    return [...this.emergencyContacts];
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  getBloodType(): BloodType | undefined {
    return this.bloodType;
  }

  getAllergies(): string | undefined {
    return this.allergies;
  }

  getChronicDiseases(): string | undefined {
    return this.chronicDiseases;
  }

  getInsuranceProviderId(): string | undefined {
    return this.insuranceProviderId;
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
