import type { Gender } from '../../../domain/enums/gender.enum.js';

export interface UpdatePersonalProfileCommandProps {
  accountId: string;
  dateOfBirth?: Date | null;
  gender?: Gender | null;
  nationalityId?: string | null;
  address?: string | null;
}

// Commands are application messages, not structural types — immutable by
// construction (matches every other module's established Command style).
export class UpdatePersonalProfileCommand {
  readonly accountId: string;
  readonly dateOfBirth?: Date | null;
  readonly gender?: Gender | null;
  readonly nationalityId?: string | null;
  readonly address?: string | null;

  constructor(props: UpdatePersonalProfileCommandProps) {
    this.accountId = props.accountId;
    this.dateOfBirth = props.dateOfBirth;
    this.gender = props.gender;
    this.nationalityId = props.nationalityId;
    this.address = props.address;
  }
}
