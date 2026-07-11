import { Language } from '../enums/language.enum.js';
import { DisplayName } from '../value-objects/display-name.value-object.js';

export interface UserProfileProps {
  displayName: DisplayName;
  phoneNumber?: string;
  preferredLanguage: Language;
}

// Child entity of the Account aggregate — no identity of its own (per
// architect decision), never loaded/saved independently of its owning
// Account. Holds cross-role personal info; Patient Profile and Doctor
// Profile (health/professional context) remain owned by their own,
// not-yet-built modules.
export class UserProfile {
  private displayName: DisplayName;
  private phoneNumber?: string;
  private preferredLanguage: Language;

  private constructor(props: UserProfileProps) {
    this.displayName = props.displayName;
    this.phoneNumber = props.phoneNumber;
    this.preferredLanguage = props.preferredLanguage;
  }

  static create(props: UserProfileProps): UserProfile {
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
}
