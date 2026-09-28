import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import { PatientProfileUpdatedEvent } from '../events/patient-profile-updated.event.js';
import { PatientDomainError } from '../exceptions/patient-domain.error.js';
import type { BloodType } from '../enums/blood-type.enum.js';
import { PatientAllergyStatus } from '../enums/patient-allergy-status.enum.js';

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
  // Patient-Reported Allergy Status (2026-09-28): only `NoneReported` is ever
  // meaningful from a client -- `HasAllergies` is derived automatically
  // below whenever `allergies` holds real text, and `Unknown` is a profile's
  // untouched default, never something a client asks to go back to.
  // Presentation validates this before it reaches here, but the guard below
  // is a domain invariant, not just an input-shape check.
  allergiesStatus?: PatientAllergyStatus | null;
  /** Who is answering (e.g. `'patient'`) -- recorded alongside the status for audit, not interpreted here. */
  allergiesStatusActorRole?: string | null;
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
  allergiesStatus?: PatientAllergyStatus;
  allergiesStatusUpdatedAt?: Date | null;
  allergiesStatusUpdatedByRole?: string | null;
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
    private allergiesStatus: PatientAllergyStatus = PatientAllergyStatus.Unknown,
    private allergiesStatusUpdatedAt: Date | null = null,
    private allergiesStatusUpdatedByRole: string | null = null,
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
      props.allergiesStatus ?? PatientAllergyStatus.Unknown,
      props.allergiesStatusUpdatedAt ?? null,
      props.allergiesStatusUpdatedByRole ?? null,
    );
  }

  update(props: UpdatePatientProfileProps): void {
    // Validate BEFORE mutating anything, so a rejected update never leaves a
    // half-applied aggregate behind. `none_reported` is checked against the
    // allergies text as it will stand after this same call (this call's new
    // value if one was given, else what is already saved) -- so submitting
    // allergy text and `NoneReported` together is rejected exactly like
    // ConfirmNoKnownAllergiesUseCase already rejects that combination for the
    // doctor's own confirmation.
    if (props.allergiesStatus === PatientAllergyStatus.NoneReported) {
      const resultingAllergies = props.allergies !== undefined ? (props.allergies ?? undefined) : this.allergies;
      if (resultingAllergies && resultingAllergies.trim().length > 0) {
        throw new PatientDomainError('Cannot report no known allergies: this patient already has a recorded allergy.');
      }
    }

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
      // own guard). This is the DOCTOR's confirmation only; a patient's own
      // `allergiesStatus` is a separate signal, guarded below.
      if (this.allergies) {
        this.allergiesConfirmedNoneAt = null;
        this.allergiesConfirmedByDoctorId = null;
      }
    }

    // Patient-Reported Allergy Status (2026-09-28). An explicit status always
    // wins; otherwise a change to the allergies text alone keeps it in sync.
    if (props.allergiesStatus !== undefined && props.allergiesStatus !== null) {
      // (Invariant already checked at the top of update(), before any mutation.)
      this.allergiesStatus = props.allergiesStatus;
      this.allergiesStatusUpdatedAt = new Date();
      this.allergiesStatusUpdatedByRole = props.allergiesStatusActorRole ?? this.allergiesStatusUpdatedByRole ?? null;
    } else if (props.allergies !== undefined) {
      // Only the allergies text changed this call -- keep status in sync
      // automatically, never left stale.
      if (this.allergies) {
        this.allergiesStatus = PatientAllergyStatus.HasAllergies;
        this.allergiesStatusUpdatedAt = new Date();
      } else if (this.allergiesStatus === PatientAllergyStatus.HasAllergies) {
        // The patient's only recorded allergy text was cleared -- we
        // genuinely no longer know, so this reverts to Unknown rather than
        // silently keeping a stale HasAllergies.
        this.allergiesStatus = PatientAllergyStatus.Unknown;
        this.allergiesStatusUpdatedAt = new Date();
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

  /** The patient's own answer -- `Unknown` for every profile that predates this field or was never asked. Independent of, and never satisfies, the doctor confirmation above. */
  getAllergiesStatus(): PatientAllergyStatus {
    return this.allergiesStatus;
  }

  getAllergiesStatusUpdatedAt(): Date | undefined {
    return this.allergiesStatusUpdatedAt ?? undefined;
  }

  getAllergiesStatusUpdatedByRole(): string | undefined {
    return this.allergiesStatusUpdatedByRole ?? undefined;
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
