import { randomUUID } from 'node:crypto';

// Onboarding Redesign (2026-07-21 proposal, §4/§6/§14 Stage O.1): plain,
// runtime-extensible lookup data (SuperAdmin-managed).
export class InsuranceProvider {
  private constructor(
    private readonly id: string,
    private name: string,
    private isActive: boolean,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static create(props: { name: string }): InsuranceProvider {
    const now = new Date();
    return new InsuranceProvider(randomUUID(), props.name, true, now, now);
  }

  static reconstitute(props: {
    id: string;
    name: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): InsuranceProvider {
    return new InsuranceProvider(props.id, props.name, props.isActive, props.createdAt, props.updatedAt);
  }

  update(props: { name?: string; isActive?: boolean }): void {
    if (props.name !== undefined) {
      this.name = props.name;
    }
    if (props.isActive !== undefined) {
      this.isActive = props.isActive;
    }
    this.updatedAt = new Date();
  }

  getId(): string {
    return this.id;
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
