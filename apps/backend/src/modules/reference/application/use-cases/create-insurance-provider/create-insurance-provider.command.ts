export interface CreateInsuranceProviderCommandProps {
  name: string;
}

// Commands are application messages, not structural types — immutable by
// construction (matches every other module's established Command style).
export class CreateInsuranceProviderCommand {
  readonly name: string;

  constructor(props: CreateInsuranceProviderCommandProps) {
    this.name = props.name;
  }
}
