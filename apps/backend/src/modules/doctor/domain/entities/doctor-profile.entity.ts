import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import { DoctorProfileUpdatedEvent } from '../events/doctor-profile-updated.event.js';
import { DoctorDomainError } from '../exceptions/doctor-domain.error.js';

import { PortfolioAward, type PortfolioAwardProps } from './portfolio-award.entity.js';
import { PortfolioPublication, type PortfolioPublicationProps } from './portfolio-publication.entity.js';

export interface RegisterDoctorProfileProps {
  accountId: string;
  licenseNumber: string;
  specialty: string;
  biography?: string;
  yearsOfExperience?: number;
  languages?: string[];
  consultationFeeAmount?: number;
  publications?: PortfolioPublicationProps[];
  awards?: PortfolioAwardProps[];
}

export interface UpdateDoctorProfileProps {
  specialty?: string;
  biography?: string;
  yearsOfExperience?: number;
  languages?: string[];
  consultationFeeAmount?: number | null;
  publications?: PortfolioPublicationProps[];
  awards?: PortfolioAwardProps[];
}

export interface ReconstituteDoctorProfileProps {
  id: string;
  accountId: string;
  licenseNumber: string;
  specialty: string;
  biography?: string;
  yearsOfExperience?: number;
  languages: string[];
  consultationFeeAmount?: number;
  publications: PortfolioPublication[];
  awards: PortfolioAward[];
  createdAt: Date;
  updatedAt: Date;
}

// Aggregate root of the Doctor bounded context (docs/10-backend-
// architecture.md's DoctorModule entry). Owns DoctorProfile + its Publication/
// Award children as one transactional unit. AvailabilityWindow is
// deliberately excluded — its lifecycle/booking concerns belong to
// SchedulingModule. Verification status is never stored here
// — TrustModule owns it exclusively.
export class DoctorProfile {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly id: string,
    private readonly accountId: string,
    private licenseNumber: string,
    private specialty: string,
    private biography: string | undefined,
    private yearsOfExperience: number | undefined,
    private languages: string[],
    private consultationFeeAmount: number | undefined,
    private publications: PortfolioPublication[],
    private awards: PortfolioAward[],
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static register(props: RegisterDoctorProfileProps): DoctorProfile {
    DoctorProfile.validateLicenseNumber(props.licenseNumber);
    DoctorProfile.validateSpecialty(props.specialty);
    DoctorProfile.validateYearsOfExperience(props.yearsOfExperience);
    DoctorProfile.validateConsultationFee(props.consultationFeeAmount);

    const now = new Date();
    const profile = new DoctorProfile(
      randomUUID(),
      props.accountId,
      props.licenseNumber.trim(),
      props.specialty.trim(),
      props.biography?.trim(),
      props.yearsOfExperience,
      props.languages ?? [],
      props.consultationFeeAmount,
      (props.publications ?? []).map((p) => PortfolioPublication.create(p)),
      (props.awards ?? []).map((a) => PortfolioAward.create(a)),
      now,
      now,
    );

    profile.record(new DoctorProfileUpdatedEvent(profile.id));
    return profile;
  }

  static reconstitute(props: ReconstituteDoctorProfileProps): DoctorProfile {
    return new DoctorProfile(
      props.id,
      props.accountId,
      props.licenseNumber,
      props.specialty,
      props.biography,
      props.yearsOfExperience,
      props.languages,
      props.consultationFeeAmount,
      props.publications,
      props.awards,
      props.createdAt,
      props.updatedAt,
    );
  }

  update(props: UpdateDoctorProfileProps): void {
    if (props.specialty !== undefined) {
      DoctorProfile.validateSpecialty(props.specialty);
      this.specialty = props.specialty.trim();
    }
    if (props.biography !== undefined) {
      this.biography = props.biography.trim();
    }
    if (props.yearsOfExperience !== undefined) {
      DoctorProfile.validateYearsOfExperience(props.yearsOfExperience);
      this.yearsOfExperience = props.yearsOfExperience;
    }
    if (props.languages !== undefined) {
      this.languages = props.languages;
    }
    if (props.consultationFeeAmount !== undefined) {
      DoctorProfile.validateConsultationFee(props.consultationFeeAmount ?? undefined);
      this.consultationFeeAmount = props.consultationFeeAmount ?? undefined;
    }
    if (props.publications !== undefined) {
      this.publications = props.publications.map((p) => PortfolioPublication.create(p));
    }
    if (props.awards !== undefined) {
      this.awards = props.awards.map((a) => PortfolioAward.create(a));
    }

    this.updatedAt = new Date();
    this.record(new DoctorProfileUpdatedEvent(this.id));
  }

  private static validateLicenseNumber(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new DoctorDomainError('licenseNumber must not be empty.');
    }
  }

  private static validateSpecialty(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new DoctorDomainError('specialty must not be empty.');
    }
  }

  private static validateYearsOfExperience(value: number | undefined): void {
    if (value !== undefined && value < 0) {
      throw new DoctorDomainError('yearsOfExperience must not be negative.');
    }
  }

  private static validateConsultationFee(value: number | undefined): void {
    if (value !== undefined && value < 0) {
      throw new DoctorDomainError('consultationFeeAmount must not be negative.');
    }
  }

  getId(): string {
    return this.id;
  }

  getAccountId(): string {
    return this.accountId;
  }

  getLicenseNumber(): string {
    return this.licenseNumber;
  }

  getSpecialty(): string {
    return this.specialty;
  }

  getBiography(): string | undefined {
    return this.biography;
  }

  getYearsOfExperience(): number | undefined {
    return this.yearsOfExperience;
  }

  getLanguages(): string[] {
    return [...this.languages];
  }

  getConsultationFeeAmount(): number | undefined {
    return this.consultationFeeAmount;
  }

  getPublications(): PortfolioPublication[] {
    return [...this.publications];
  }

  getAwards(): PortfolioAward[] {
    return [...this.awards];
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  releaseDomainEvents(): DomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents.length = 0;
    return events;
  }

  private record(event: DomainEvent): void {
    this.domainEvents.push(event);
  }
}
