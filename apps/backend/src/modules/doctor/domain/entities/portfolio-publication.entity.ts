import { randomUUID } from 'node:crypto';

import { DoctorDomainError } from '../exceptions/doctor-domain.error.js';

export interface PortfolioPublicationProps {
  title: string;
  reference?: string;
  publishedAt?: Date;
}

// Child entity of the DoctorProfile aggregate (docs/10-backend-architecture.md:
// "Owned entities: DoctorProfile, PortfolioPublication, ..."). Has its own id
// since it's individually addressable within the profile's publication list,
// unlike Identity's UserProfile which has none.
export class PortfolioPublication {
  private constructor(
    private readonly id: string,
    private readonly title: string,
    private readonly reference: string | undefined,
    private readonly publishedAt: Date | undefined,
  ) {}

  static create(props: PortfolioPublicationProps): PortfolioPublication {
    if (!props.title || props.title.trim().length === 0) {
      throw new DoctorDomainError('Publication title must not be empty.');
    }
    return new PortfolioPublication(randomUUID(), props.title.trim(), props.reference, props.publishedAt);
  }

  static reconstitute(props: { id: string } & PortfolioPublicationProps): PortfolioPublication {
    return new PortfolioPublication(props.id, props.title, props.reference, props.publishedAt);
  }

  getId(): string {
    return this.id;
  }

  getTitle(): string {
    return this.title;
  }

  getReference(): string | undefined {
    return this.reference;
  }

  getPublishedAt(): Date | undefined {
    return this.publishedAt;
  }
}
