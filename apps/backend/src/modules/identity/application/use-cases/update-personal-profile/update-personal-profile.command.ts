import type { Gender } from '../../../domain/enums/gender.enum.js';

export interface UpdatePersonalProfileCommandProps {
  accountId: string;
  dateOfBirth?: Date | null;
  gender?: Gender | null;
  nationalityId?: string | null;
  address?: string | null;
  // Demo Data & Profile Avatar Pass: no public request DTO/controller wires
  // this yet -- only the demo seed script calls this use case with it today.
  avatarUrl?: string | null;
  // phoneNumber gap fix (Doctor Settings Rebuild, Phase 0 Part C): threaded
  // through to Account.updatePersonalProfile() -> UserProfile.updatePhoneNumber().
  phoneNumber?: string;
}

// Commands are application messages, not structural types — immutable by
// construction (matches every other module's established Command style).
export class UpdatePersonalProfileCommand {
  readonly accountId: string;
  readonly dateOfBirth?: Date | null;
  readonly gender?: Gender | null;
  readonly nationalityId?: string | null;
  readonly address?: string | null;
  readonly avatarUrl?: string | null;
  readonly phoneNumber?: string;

  constructor(props: UpdatePersonalProfileCommandProps) {
    this.accountId = props.accountId;
    this.dateOfBirth = props.dateOfBirth;
    this.gender = props.gender;
    this.nationalityId = props.nationalityId;
    this.address = props.address;
    this.avatarUrl = props.avatarUrl;
    this.phoneNumber = props.phoneNumber;
  }
}
