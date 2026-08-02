import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import { DoctorProfileUpdatedEvent } from '../events/doctor-profile-updated.event.js';
import { DoctorDomainError } from '../exceptions/doctor-domain.error.js';
import type { ProfessionalRank } from '../enums/professional-rank.enum.js';

import { PortfolioAward, type PortfolioAwardProps } from './portfolio-award.entity.js';
import { PortfolioPublication, type PortfolioPublicationProps } from './portfolio-publication.entity.js';
import { PortfolioWorkExperience, type PortfolioWorkExperienceProps } from './portfolio-work-experience.entity.js';

export interface RegisterDoctorProfileProps {
  accountId: string;
  licenseNumber: string;
  biography?: string;
  yearsOfExperience?: number;
  languages?: string[];
  // Doctor Profile Redesign (2026-08-02): a plain string list, same shape/
  // storage convention as `languages` -- provider names have no sub-fields
  // of their own, unlike the Experience timeline below.
  insuranceProviders?: string[];
  consultationFeeAmount?: number;
  // Doctor Onboarding (Phase 4 continuation): optional hospital affiliation,
  // reusing the column Stage 4 already added to the Hospital org-chart --
  // no tenant scoping implied, see Hospital entity's own comment.
  hospitalId?: string;
  publications?: PortfolioPublicationProps[];
  awards?: PortfolioAwardProps[];
  // Doctor Profile Redesign (2026-08-02): work-history timeline backing the
  // reference design's "Experience" section -- structurally identical to
  // publications/awards (own child entity, replace-the-whole-list update
  // semantics).
  workExperience?: PortfolioWorkExperienceProps[];
  // Onboarding Redesign (2026-07-21 proposal, Stage O.9): the sole source of
  // a doctor's specialty -- the transitional free-text `specialty` field
  // (Stage O.3-O.8) is gone; specialtyId is now required, matching the
  // database column it backs. departmentId requires hospitalId (validated
  // below) -- a department only makes sense within a hospital, never
  // standalone.
  specialtyId: string;
  professionalRank?: ProfessionalRank;
  licenseExpiryDate?: Date;
  departmentId?: string;
}

export interface UpdateDoctorProfileProps {
  biography?: string;
  yearsOfExperience?: number;
  languages?: string[];
  insuranceProviders?: string[];
  consultationFeeAmount?: number | null;
  hospitalId?: string | null;
  publications?: PortfolioPublicationProps[];
  awards?: PortfolioAwardProps[];
  workExperience?: PortfolioWorkExperienceProps[];
  // Never nullable -- a doctor profile always has a specialty, this only
  // ever changes which one.
  specialtyId?: string;
  professionalRank?: ProfessionalRank | null;
  licenseExpiryDate?: Date | null;
  departmentId?: string | null;
}

export interface ReconstituteDoctorProfileProps {
  id: string;
  accountId: string;
  licenseNumber: string;
  biography?: string;
  yearsOfExperience?: number;
  languages: string[];
  insuranceProviders?: string[];
  consultationFeeAmount?: number;
  hospitalId?: string;
  publications: PortfolioPublication[];
  awards: PortfolioAward[];
  workExperience?: PortfolioWorkExperience[];
  createdAt: Date;
  updatedAt: Date;
  specialtyId: string;
  professionalRank?: ProfessionalRank;
  licenseExpiryDate?: Date;
  departmentId?: string;
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
    private biography: string | undefined,
    private yearsOfExperience: number | undefined,
    private languages: string[],
    private insuranceProviders: string[],
    private consultationFeeAmount: number | undefined,
    private hospitalId: string | undefined,
    private publications: PortfolioPublication[],
    private awards: PortfolioAward[],
    private workExperience: PortfolioWorkExperience[],
    private readonly createdAt: Date,
    private updatedAt: Date,
    private specialtyId: string,
    private professionalRank: ProfessionalRank | undefined,
    private licenseExpiryDate: Date | undefined,
    private departmentId: string | undefined,
  ) {}

  static register(props: RegisterDoctorProfileProps): DoctorProfile {
    DoctorProfile.validateLicenseNumber(props.licenseNumber);
    DoctorProfile.validateYearsOfExperience(props.yearsOfExperience);
    DoctorProfile.validateConsultationFee(props.consultationFeeAmount);
    DoctorProfile.validateDepartmentRequiresHospital(props.hospitalId, props.departmentId);

    const now = new Date();
    const profile = new DoctorProfile(
      randomUUID(),
      props.accountId,
      props.licenseNumber.trim(),
      props.biography?.trim(),
      props.yearsOfExperience,
      props.languages ?? [],
      props.insuranceProviders ?? [],
      props.consultationFeeAmount,
      props.hospitalId,
      (props.publications ?? []).map((p) => PortfolioPublication.create(p)),
      (props.awards ?? []).map((a) => PortfolioAward.create(a)),
      (props.workExperience ?? []).map((w) => PortfolioWorkExperience.create(w)),
      now,
      now,
      props.specialtyId,
      props.professionalRank,
      props.licenseExpiryDate,
      props.departmentId,
    );

    profile.record(new DoctorProfileUpdatedEvent(profile.id));
    return profile;
  }

  static reconstitute(props: ReconstituteDoctorProfileProps): DoctorProfile {
    return new DoctorProfile(
      props.id,
      props.accountId,
      props.licenseNumber,
      props.biography,
      props.yearsOfExperience,
      props.languages,
      props.insuranceProviders ?? [],
      props.consultationFeeAmount,
      props.hospitalId,
      props.publications,
      props.awards,
      props.workExperience ?? [],
      props.createdAt,
      props.updatedAt,
      props.specialtyId,
      props.professionalRank,
      props.licenseExpiryDate,
      props.departmentId,
    );
  }

  update(props: UpdateDoctorProfileProps): void {
    if (props.specialtyId !== undefined) {
      this.specialtyId = props.specialtyId;
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
    if (props.insuranceProviders !== undefined) {
      this.insuranceProviders = props.insuranceProviders;
    }
    if (props.consultationFeeAmount !== undefined) {
      DoctorProfile.validateConsultationFee(props.consultationFeeAmount ?? undefined);
      this.consultationFeeAmount = props.consultationFeeAmount ?? undefined;
    }

    const nextHospitalId = props.hospitalId !== undefined ? (props.hospitalId ?? undefined) : this.hospitalId;
    const nextDepartmentId = props.departmentId !== undefined ? (props.departmentId ?? undefined) : this.departmentId;
    DoctorProfile.validateDepartmentRequiresHospital(nextHospitalId, nextDepartmentId);
    this.hospitalId = nextHospitalId;
    this.departmentId = nextDepartmentId;

    if (props.publications !== undefined) {
      this.publications = props.publications.map((p) => PortfolioPublication.create(p));
    }
    if (props.awards !== undefined) {
      this.awards = props.awards.map((a) => PortfolioAward.create(a));
    }
    if (props.workExperience !== undefined) {
      this.workExperience = props.workExperience.map((w) => PortfolioWorkExperience.create(w));
    }
    if (props.professionalRank !== undefined) {
      this.professionalRank = props.professionalRank ?? undefined;
    }
    if (props.licenseExpiryDate !== undefined) {
      this.licenseExpiryDate = props.licenseExpiryDate ?? undefined;
    }

    this.updatedAt = new Date();
    this.record(new DoctorProfileUpdatedEvent(this.id));
  }

  private static validateLicenseNumber(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new DoctorDomainError('licenseNumber must not be empty.');
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

  // Onboarding Redesign (2026-07-21 proposal, Stage O.3): a department only
  // makes sense within a hospital -- never standalone.
  private static validateDepartmentRequiresHospital(
    hospitalId: string | undefined,
    departmentId: string | undefined,
  ): void {
    if (departmentId !== undefined && !hospitalId) {
      throw new DoctorDomainError('departmentId requires hospitalId to be set.');
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

  getBiography(): string | undefined {
    return this.biography;
  }

  getYearsOfExperience(): number | undefined {
    return this.yearsOfExperience;
  }

  getLanguages(): string[] {
    return [...this.languages];
  }

  getInsuranceProviders(): string[] {
    return [...this.insuranceProviders];
  }

  getConsultationFeeAmount(): number | undefined {
    return this.consultationFeeAmount;
  }

  getHospitalId(): string | undefined {
    return this.hospitalId;
  }

  getSpecialtyId(): string {
    return this.specialtyId;
  }

  getProfessionalRank(): ProfessionalRank | undefined {
    return this.professionalRank;
  }

  getLicenseExpiryDate(): Date | undefined {
    return this.licenseExpiryDate;
  }

  getDepartmentId(): string | undefined {
    return this.departmentId;
  }

  getPublications(): PortfolioPublication[] {
    return [...this.publications];
  }

  getAwards(): PortfolioAward[] {
    return [...this.awards];
  }

  getWorkExperience(): PortfolioWorkExperience[] {
    return [...this.workExperience];
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
