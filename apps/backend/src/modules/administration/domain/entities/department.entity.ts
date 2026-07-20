import { randomUUID } from 'node:crypto';

// Child grouping entity, scoped to one Hospital (see hospital.entity.ts's
// own comment -- same "plain org-chart data" shape, not a tenant boundary).
export class Department {
  private constructor(
    private readonly id: string,
    private readonly hospitalId: string,
    private readonly name: string,
    private readonly createdAt: Date,
  ) {}

  static create(props: { hospitalId: string; name: string }): Department {
    return new Department(randomUUID(), props.hospitalId, props.name, new Date());
  }

  static reconstitute(props: { id: string; hospitalId: string; name: string; createdAt: Date }): Department {
    return new Department(props.id, props.hospitalId, props.name, props.createdAt);
  }

  getId(): string {
    return this.id;
  }

  getHospitalId(): string {
    return this.hospitalId;
  }

  getName(): string {
    return this.name;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }
}
