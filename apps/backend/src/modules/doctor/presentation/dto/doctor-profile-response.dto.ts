import type { Account } from '../../../identity/domain/entities/account.entity.js';
import type { DoctorProfile } from '../../domain/entities/doctor-profile.entity.js';
import type { ProfessionalRank } from '../../domain/enums/professional-rank.enum.js';

interface PublicationView {
  id: string;
  title: string;
  reference?: string;
  publishedAt?: string;
}

interface AwardView {
  id: string;
  title: string;
  issuingBody?: string;
  awardedAt?: string;
}

interface WorkExperienceView {
  id: string;
  organizationName: string;
  position: string;
  professionalRank?: ProfessionalRank;
  startDate: string;
  endDate?: string;
  description?: string;
}

// Composes DoctorModule's own DoctorProfile with IdentityModule's Account
// (fullName/email/phoneNumber live on Account.userProfile, not duplicated
// here — module-to-module composition at the presentation layer, not a
// cross-module repository read, per docs/10-backend-architecture.md Section
// 11), same pattern as PatientProfileResponseDto.
export class DoctorProfileResponseDto {
  id!: string;
  accountId!: string;
  fullName!: string;
  email!: string;
  phoneNumber?: string;
  avatarUrl?: string;
  licenseNumber!: string;
  biography?: string;
  yearsOfExperience?: number;
  languages!: string[];
  insuranceProviders!: string[];
  consultationFeeAmount?: number;
  hospitalId?: string;
  publications!: PublicationView[];
  awards!: AwardView[];
  workExperience!: WorkExperienceView[];
  createdAt!: string;
  updatedAt!: string;
  specialtyId!: string;
  professionalRank?: ProfessionalRank;
  licenseExpiryDate?: string;
  departmentId?: string;

  static fromDomain(profile: DoctorProfile, account: Account): DoctorProfileResponseDto {
    const userProfile = account.getUserProfile();
    const dto = new DoctorProfileResponseDto();

    dto.id = profile.getId();
    dto.accountId = profile.getAccountId();
    dto.fullName = userProfile.getDisplayName().toString();
    dto.email = account.getEmail().toString();
    dto.phoneNumber = userProfile.getPhoneNumber();
    dto.avatarUrl = userProfile.getAvatarUrl();
    dto.licenseNumber = profile.getLicenseNumber();
    dto.biography = profile.getBiography();
    dto.yearsOfExperience = profile.getYearsOfExperience();
    dto.languages = profile.getLanguages();
    dto.insuranceProviders = profile.getInsuranceProviders();
    dto.consultationFeeAmount = profile.getConsultationFeeAmount();
    dto.hospitalId = profile.getHospitalId();
    dto.publications = profile.getPublications().map((p) => ({
      id: p.getId(),
      title: p.getTitle(),
      reference: p.getReference(),
      publishedAt: p.getPublishedAt()?.toISOString(),
    }));
    dto.awards = profile.getAwards().map((a) => ({
      id: a.getId(),
      title: a.getTitle(),
      issuingBody: a.getIssuingBody(),
      awardedAt: a.getAwardedAt()?.toISOString(),
    }));
    dto.workExperience = profile.getWorkExperience().map((w) => ({
      id: w.getId(),
      organizationName: w.getOrganizationName(),
      position: w.getPosition(),
      professionalRank: w.getProfessionalRank(),
      startDate: w.getStartDate().toISOString(),
      endDate: w.getEndDate()?.toISOString(),
      description: w.getDescription(),
    }));
    dto.createdAt = profile.getCreatedAt().toISOString();
    dto.updatedAt = profile.getUpdatedAt().toISOString();
    dto.specialtyId = profile.getSpecialtyId();
    dto.professionalRank = profile.getProfessionalRank();
    dto.licenseExpiryDate = profile.getLicenseExpiryDate()?.toISOString();
    dto.departmentId = profile.getDepartmentId();

    return dto;
  }
}
