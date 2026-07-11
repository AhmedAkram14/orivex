import { randomUUID } from 'node:crypto';

import { PatientDomainError } from '../exceptions/patient-domain.error.js';
import { EmergencyRelationship } from '../enums/emergency-relationship.enum.js';

export interface EmergencyContactProps {
  name: string;
  relationship: EmergencyRelationship;
  phoneNumber: string;
}

// Child entity of the PatientProfile aggregate (docs/10-backend-
// architecture.md's PatientModule entry: "Owned entities: ... EmergencyContact").
export class EmergencyContact {
  private constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly relationship: EmergencyRelationship,
    private readonly phoneNumber: string,
  ) {}

  static create(props: EmergencyContactProps): EmergencyContact {
    if (!props.name || props.name.trim().length === 0) {
      throw new PatientDomainError('Emergency contact name must not be empty.');
    }
    if (!props.phoneNumber || props.phoneNumber.trim().length === 0) {
      throw new PatientDomainError('Emergency contact phoneNumber must not be empty.');
    }
    return new EmergencyContact(randomUUID(), props.name.trim(), props.relationship, props.phoneNumber.trim());
  }

  static reconstitute(props: { id: string } & EmergencyContactProps): EmergencyContact {
    return new EmergencyContact(props.id, props.name, props.relationship, props.phoneNumber);
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getRelationship(): EmergencyRelationship {
    return this.relationship;
  }

  getPhoneNumber(): string {
    return this.phoneNumber;
  }
}
