export interface UpdateCountryCommandProps {
  countryId: string;
  name?: string;
  isActive?: boolean;
}

// Commands are application messages, not structural types — immutable by
// construction (matches every other module's established Command style).
export class UpdateCountryCommand {
  readonly countryId: string;
  readonly name?: string;
  readonly isActive?: boolean;

  constructor(props: UpdateCountryCommandProps) {
    this.countryId = props.countryId;
    this.name = props.name;
    this.isActive = props.isActive;
  }
}
