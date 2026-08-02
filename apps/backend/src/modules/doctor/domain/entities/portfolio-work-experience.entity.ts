import { randomUUID } from 'node:crypto';

import { DoctorDomainError } from '../exceptions/doctor-domain.error.js';
import { ProfessionalRank } from '../enums/professional-rank.enum.js';

export interface PortfolioWorkExperienceProps {
  organizationName: string;
  position: string;
  // The doctor's rank/degree *at that position* (e.g. "consultant"),
  // deliberately its own per-entry field rather than reusing the current
  // `DoctorProfile.professionalRank` -- a doctor's rank at a past position
  // often differs from their rank today (e.g. registrar -> consultant).
  professionalRank?: ProfessionalRank;
  startDate: Date;
  // Undefined means "present" -- an ongoing position, matching the
  // Experience timeline's "2021-Present" reference-design convention.
  endDate?: Date;
  description?: string;
}

// Child entity of the DoctorProfile aggregate, structurally identical to
// PortfolioPublication/PortfolioAward (own id, own factory/reconstitute
// pair) -- modeled as its own type per the same readiness review that
// flagged Publications/Awards as distinct enough to deserve separate
// sub-entity types (docs/08-logical-data-model.md). Backs the Doctor
// Profile page's "Experience" work-history timeline.
export class PortfolioWorkExperience {
  private constructor(
    private readonly id: string,
    private readonly organizationName: string,
    private readonly position: string,
    private readonly professionalRank: ProfessionalRank | undefined,
    private readonly startDate: Date,
    private readonly endDate: Date | undefined,
    private readonly description: string | undefined,
  ) {}

  static create(props: PortfolioWorkExperienceProps): PortfolioWorkExperience {
    if (!props.organizationName || props.organizationName.trim().length === 0) {
      throw new DoctorDomainError('Work experience organizationName must not be empty.');
    }
    if (!props.position || props.position.trim().length === 0) {
      throw new DoctorDomainError('Work experience position must not be empty.');
    }
    if (!props.startDate) {
      throw new DoctorDomainError('Work experience startDate must be provided.');
    }
    if (props.endDate && props.endDate < props.startDate) {
      throw new DoctorDomainError('Work experience endDate must not be before startDate.');
    }
    return new PortfolioWorkExperience(
      randomUUID(),
      props.organizationName.trim(),
      props.position.trim(),
      props.professionalRank,
      props.startDate,
      props.endDate,
      props.description,
    );
  }

  static reconstitute(props: { id: string } & PortfolioWorkExperienceProps): PortfolioWorkExperience {
    return new PortfolioWorkExperience(
      props.id,
      props.organizationName,
      props.position,
      props.professionalRank,
      props.startDate,
      props.endDate,
      props.description,
    );
  }

  getId(): string {
    return this.id;
  }

  getOrganizationName(): string {
    return this.organizationName;
  }

  getPosition(): string {
    return this.position;
  }

  getProfessionalRank(): ProfessionalRank | undefined {
    return this.professionalRank;
  }

  getStartDate(): Date {
    return this.startDate;
  }

  getEndDate(): Date | undefined {
    return this.endDate;
  }

  getDescription(): string | undefined {
    return this.description;
  }
}
