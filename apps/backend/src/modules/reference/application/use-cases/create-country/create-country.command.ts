export interface CreateCountryCommandProps {
  name: string;
  iso2Code: string;
}

// Commands are application messages, not structural types — immutable by
// construction (matches every other module's established Command style).
export class CreateCountryCommand {
  readonly name: string;
  readonly iso2Code: string;

  constructor(props: CreateCountryCommandProps) {
    this.name = props.name;
    this.iso2Code = props.iso2Code;
  }
}
