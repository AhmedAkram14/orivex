import { Gender } from '../enums/gender.enum.js';
import { Language } from '../enums/language.enum.js';
import { IdentityDomainError } from '../exceptions/identity-domain.error.js';
import { DisplayName } from '../value-objects/display-name.value-object.js';

export interface UserProfileProps {
  displayName: DisplayName;
  phoneNumber?: string;
  preferredLanguage: Language;
  dateOfBirth?: Date;
  gender?: Gender;
  nationalityId?: string;
  address?: string;
}

// Child entity of the Account aggregate — no identity of its own (per
// architect decision), never loaded/saved independently of its owning
// Account. Holds cross-role personal info; Patient Profile and Doctor
// Profile (health/professional context) remain owned by their own modules.
//
// Onboarding Redesign (2026-07-21 proposal, §0a): dateOfBirth/gender/
// nationalityId/address were added here specifically, extending this
// existing entity, rather than introducing a new PersonalProfile table --
// Identity is the single owner of cross-role personal info, shared verbatim
// by both Patient and Doctor onboarding's "Personal Info" step. Deliberately
// no `fullName` field: displayName already serves that purpose.
export class UserProfile {
  private displayName: DisplayName;
  private phoneNumber?: string;
  private preferredLanguage: Language;
  private dateOfBirth?: Date;
  private gender?: Gender;
  private nationalityId?: string;
  private address?: string;

  private constructor(props: UserProfileProps) {
    this.displayName = props.displayName;
    this.phoneNumber = props.phoneNumber;
    this.preferredLanguage = props.preferredLanguage;
    this.dateOfBirth = props.dateOfBirth;
    this.gender = props.gender;
    this.nationalityId = props.nationalityId;
    this.address = props.address;
  }

  static create(props: UserProfileProps): UserProfile {
    UserProfile.validateDateOfBirth(props.dateOfBirth);
    return new UserProfile(props);
  }

  getDisplayName(): DisplayName {
    return this.displayName;
  }

  getPhoneNumber(): string | undefined {
    return this.phoneNumber;
  }

  getPreferredLanguage(): Language {
    return this.preferredLanguage;
  }

  getDateOfBirth(): Date | undefined {
    return this.dateOfBirth;
  }

  getGender(): Gender | undefined {
    return this.gender;
  }

  getNationalityId(): string | undefined {
    return this.nationalityId;
  }

  getAddress(): string | undefined {
    return this.address;
  }

  updateDisplayName(displayName: DisplayName): void {
    this.displayName = displayName;
  }

  // Stored as a plain string this sprint — international phone
  // parsing/formatting is explicitly out of scope (Sprint 1.1A).
  updatePhoneNumber(phoneNumber: string | undefined): void {
    this.phoneNumber = phoneNumber;
  }

  updatePreferredLanguage(preferredLanguage: Language): void {
    this.preferredLanguage = preferredLanguage;
  }

  updateDateOfBirth(dateOfBirth: Date | undefined): void {
    UserProfile.validateDateOfBirth(dateOfBirth);
    this.dateOfBirth = dateOfBirth;
  }

  updateGender(gender: Gender | undefined): void {
    this.gender = gender;
  }

  updateNationalityId(nationalityId: string | undefined): void {
    this.nationalityId = nationalityId;
  }

  updateAddress(address: string | undefined): void {
    this.address = address;
  }

  private static validateDateOfBirth(value: Date | undefined): void {
    if (value !== undefined && value.getTime() > Date.now()) {
      throw new IdentityDomainError('dateOfBirth must not be in the future.');
    }
  }
}
