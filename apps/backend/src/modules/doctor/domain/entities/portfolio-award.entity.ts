import { randomUUID } from 'node:crypto';

import { DoctorDomainError } from '../exceptions/doctor-domain.error.js';

export interface PortfolioAwardProps {
  title: string;
  issuingBody?: string;
  awardedAt?: Date;
}

// Child entity of the DoctorProfile aggregate — modeled as its own type
// (not a generic "PortfolioItem"), per docs/08-logical-data-model.md's own
// readiness review flagging Publications and Awards as different enough to
// deserve distinct sub-entity types.
export class PortfolioAward {
  private constructor(
    private readonly id: string,
    private readonly title: string,
    private readonly issuingBody: string | undefined,
    private readonly awardedAt: Date | undefined,
  ) {}

  static create(props: PortfolioAwardProps): PortfolioAward {
    if (!props.title || props.title.trim().length === 0) {
      throw new DoctorDomainError('Award title must not be empty.');
    }
    return new PortfolioAward(randomUUID(), props.title.trim(), props.issuingBody, props.awardedAt);
  }

  static reconstitute(props: { id: string } & PortfolioAwardProps): PortfolioAward {
    return new PortfolioAward(props.id, props.title, props.issuingBody, props.awardedAt);
  }

  getId(): string {
    return this.id;
  }

  getTitle(): string {
    return this.title;
  }

  getIssuingBody(): string | undefined {
    return this.issuingBody;
  }

  getAwardedAt(): Date | undefined {
    return this.awardedAt;
  }
}
