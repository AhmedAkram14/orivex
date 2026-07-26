export interface UpdateMedicalSpecialtyCommandProps {
  medicalSpecialtyId: string;
  name?: string;
  isActive?: boolean;
}

// Commands are application messages, not structural types — immutable by
// construction (matches every other module's established Command style).
export class UpdateMedicalSpecialtyCommand {
  readonly medicalSpecialtyId: string;
  readonly name?: string;
  readonly isActive?: boolean;

  constructor(props: UpdateMedicalSpecialtyCommandProps) {
    this.medicalSpecialtyId = props.medicalSpecialtyId;
    this.name = props.name;
    this.isActive = props.isActive;
  }
}
