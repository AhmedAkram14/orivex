import { randomUUID } from 'node:crypto';

// Onboarding Redesign (2026-07-21 proposal, §4/§6/§14 Stage O.1): plain,
// runtime-extensible lookup data. Doubles as the nationality list -- a
// nationality is a country reference, no separate table (proposal §4).
export class Country {
  private constructor(
    private readonly id: string,
    private name: string,
    private iso2Code: string,
    private isActive: boolean,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static create(props: { name: string; iso2Code: string }): Country {
    const now = new Date();
    return new Country(randomUUID(), props.name, props.iso2Code.toUpperCase(), true, now, now);
  }

  static reconstitute(props: {
    id: string;
    name: string;
    iso2Code: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): Country {
    return new Country(props.id, props.name, props.iso2Code, props.isActive, props.createdAt, props.updatedAt);
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

  getIso2Code(): string {
    return this.iso2Code;
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
