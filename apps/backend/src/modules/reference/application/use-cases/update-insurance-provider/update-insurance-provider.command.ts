export interface UpdateInsuranceProviderCommandProps {
  insuranceProviderId: string;
  name?: string;
  isActive?: boolean;
}

// Commands are application messages, not structural types — immutable by
// construction (matches every other module's established Command style).
export class UpdateInsuranceProviderCommand {
  readonly insuranceProviderId: string;
  readonly name?: string;
  readonly isActive?: boolean;

  constructor(props: UpdateInsuranceProviderCommandProps) {
    this.insuranceProviderId = props.insuranceProviderId;
    this.name = props.name;
    this.isActive = props.isActive;
  }
}
