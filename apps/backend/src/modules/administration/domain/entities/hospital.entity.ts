import { randomUUID } from 'node:crypto';

// ORIVEX Roadmap 2.0 Stage 4: AdministrationModule's own aggregate root -- a
// plain grouping/org-chart entity (docs/06-system-architecture.md's
// "Explicitly Deferred" note: true multi-tenant SaaS tenant isolation is out
// of scope; this is naming/grouping data only, matching Holiday's own
// "plain data, no heavy value objects" shape).
export class Hospital {
  private constructor(
    private readonly id: string,
    private name: string,
    private address: string | undefined,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static create(props: { name: string; address?: string }): Hospital {
    const now = new Date();
    return new Hospital(randomUUID(), props.name, props.address, now, now);
  }

  static reconstitute(props: {
    id: string;
    name: string;
    address: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Hospital {
    return new Hospital(props.id, props.name, props.address ?? undefined, props.createdAt, props.updatedAt);
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getAddress(): string | undefined {
    return this.address;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }
}
