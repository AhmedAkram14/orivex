// Consent gap fix (ORIVEX Remaining Work Audit, P0 C3): docs/09-physical-
// database.md's "slowly-changing shared vocabularies" reference table --
// same shape as MedicalSpecialty/InsuranceProvider, just for consent
// scopes ("general" today; "mental_health" once a real mental-health data
// field exists to gate -- see the schema comment on ConsentScopeCategory).
// Read-only in this pass: no create()/update() -- seeded once via this
// feature's own migration, not admin-managed yet.
export class ConsentScopeCategory {
  private constructor(
    private readonly id: string,
    private readonly code: string,
    private readonly name: string,
    private readonly isActive: boolean,
    private readonly createdAt: Date,
    private readonly updatedAt: Date,
  ) {}

  static reconstitute(props: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): ConsentScopeCategory {
    return new ConsentScopeCategory(props.id, props.code, props.name, props.isActive, props.createdAt, props.updatedAt);
  }

  getId(): string {
    return this.id;
  }

  getCode(): string {
    return this.code;
  }

  getName(): string {
    return this.name;
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }
}
