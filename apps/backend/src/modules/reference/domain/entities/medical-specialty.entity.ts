import { randomUUID } from 'node:crypto';

// Onboarding Redesign (2026-07-21 proposal, §4/§6/§14 Stage O.1): plain,
// runtime-extensible lookup data (SuperAdmin-managed) -- finishes the
// `reference` schema docs/09-physical-database.md already designed but
// never built. Shape mirrors Hospital's own "plain data, no heavy value
// objects" precedent exactly (AdministrationModule's aggregate root).
//
// Localization fix: nameAr is optional -- an admin may not have translated
// every specialty yet. Every consumer (DTOs below) falls back to `name`
// when it's unset, never rendering a blank string.
export class MedicalSpecialty {
  private constructor(
    private readonly id: string,
    private name: string,
    private nameAr: string | undefined,
    private isActive: boolean,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static create(props: { name: string; nameAr?: string }): MedicalSpecialty {
    const now = new Date();
    return new MedicalSpecialty(randomUUID(), props.name, props.nameAr, true, now, now);
  }

  static reconstitute(props: {
    id: string;
    name: string;
    nameAr?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): MedicalSpecialty {
    return new MedicalSpecialty(props.id, props.name, props.nameAr, props.isActive, props.createdAt, props.updatedAt);
  }

  update(props: { name?: string; nameAr?: string; isActive?: boolean }): void {
    if (props.name !== undefined) {
      this.name = props.name;
    }
    if (props.nameAr !== undefined) {
      this.nameAr = props.nameAr;
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

  getNameAr(): string | undefined {
    return this.nameAr;
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
