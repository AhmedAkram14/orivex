import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import { PatientProfileUpdatedEvent } from '../events/patient-profile-updated.event.js';
import { PatientDomainError } from '../exceptions/patient-domain.error.js';
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
  // I6 -- Health Passport (docs/01.1-prd-update.md §17-30). Same free-text
  // convention as allergies/chronicDiseases above.
  lifestyleNotes?: string | null;
  nutritionNotes?: string | null;
  exerciseNotes?: string | null;
  mentalHealthNotes?: string | null;
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
  lifestyleNotes?: string;
  nutritionNotes?: string;
  exerciseNotes?: string;
  mentalHealthNotes?: string;
  allergiesConfirmedNoneAt?: Date | null;
  allergiesConfirmedByDoctorId?: string | null;
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
    private lifestyleNotes: string | undefined,
    private nutritionNotes: string | undefined,
    private exerciseNotes: string | undefined,
    private mentalHealthNotes: string | undefined,
    private allergiesConfirmedNoneAt: Date | null = null,
    private allergiesConfirmedByDoctorId: string | null = null,
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
      undefined,
      undefined,
      undefined,
      undefined,
      null,
      null,
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
      props.lifestyleNotes,
      props.nutritionNotes,
      props.exerciseNotes,
      props.mentalHealthNotes,
      props.allergiesConfirmedNoneAt ?? null,
      props.allergiesConfirmedByDoctorId ?? null,
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
      // A patient (or their care team) recording a real, positive allergy
      // supersedes any earlier "confirmed none" attestation -- the two are
      // mutually exclusive by construction (see confirmNoKnownAllergies()'s
      // own guard).
      if (this.allergies) {
        this.allergiesConfirmedNoneAt = null;
        this.allergiesConfirmedByDoctorId = null;
      }
    }
    if (props.chronicDiseases !== undefined) {
      this.chronicDiseases = props.chronicDiseases ?? undefined;
    }
    if (props.insuranceProviderId !== undefined) {
      this.insuranceProviderId = props.insuranceProviderId ?? undefined;
    }
    if (props.lifestyleNotes !== undefined) {
      this.lifestyleNotes = props.lifestyleNotes ?? undefined;
    }
    if (props.nutritionNotes !== undefined) {
      this.nutritionNotes = props.nutritionNotes ?? undefined;
    }
    if (props.exerciseNotes !== undefined) {
      this.exerciseNotes = props.exerciseNotes ?? undefined;
    }
    if (props.mentalHealthNotes !== undefined) {
      this.mentalHealthNotes = props.mentalHealthNotes ?? undefined;
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

  getLifestyleNotes(): string | undefined {
    return this.lifestyleNotes;
  }

  getNutritionNotes(): string | undefined {
    return this.nutritionNotes;
  }

  getExerciseNotes(): string | undefined {
    return this.exerciseNotes;
  }

  getMentalHealthNotes(): string | undefined {
    return this.mentalHealthNotes;
  }

  getAllergiesConfirmedNoneAt(): Date | null {
    return this.allergiesConfirmedNoneAt;
  }

  // Patient Record Page P0 fix: null for every row confirmed before this
  // field existed (and for any future confirmation whose doctor identity
  // couldn't be resolved) -- callers must treat null as "confirmed, doctor
  // unknown," a normal supported state, not an error.
  getAllergiesConfirmedByDoctorId(): string | undefined {
    return this.allergiesConfirmedByDoctorId ?? undefined;
  }

  // Doctor Patient Chart plan, 4.3: a doctor-authored "confirmed no known
  // allergies" attestation, modeled as its own nullable timestamp rather
  // than a sentinel string in `allergies` (see the field's own schema
  // comment for the full rationale). Guarded here, not just in the
  // application layer, because "never overwrite a real positive allergy
  // record with 'confirmed none'" is a genuine domain invariant of this
  // aggregate, not merely a use-case-level check.
  confirmNoKnownAllergies(doctorId: string): void {
    if (this.allergies && this.allergies.trim().length > 0) {
      throw new PatientDomainError(
        'Cannot confirm no known allergies: this patient already has a recorded allergy.',
      );
    }
    this.allergiesConfirmedNoneAt = new Date();
    this.allergiesConfirmedByDoctorId = doctorId;
    this.updatedAt = new Date();
    this.record(new PatientProfileUpdatedEvent(this.id));
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
