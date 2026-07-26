export interface CreateMedicalSpecialtyCommandProps {
  name: string;
}

// Commands are application messages, not structural types — immutable by
// construction (matches every other module's established Command style).
export class CreateMedicalSpecialtyCommand {
  readonly name: string;

  constructor(props: CreateMedicalSpecialtyCommandProps) {
    this.name = props.name;
  }
}
