import type { Account } from '../../../identity/domain/entities/account.entity.js';
import type { DoctorProfile } from '../../domain/entities/doctor-profile.entity.js';

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
  licenseNumber!: string;
  specialty!: string;
  biography?: string;
  yearsOfExperience?: number;
  languages!: string[];
  consultationFeeAmount?: number;
  hospitalId?: string;
  publications!: PublicationView[];
  awards!: AwardView[];
  createdAt!: string;
  updatedAt!: string;

  static fromDomain(profile: DoctorProfile, account: Account): DoctorProfileResponseDto {
    const userProfile = account.getUserProfile();
    const dto = new DoctorProfileResponseDto();

    dto.id = profile.getId();
    dto.accountId = profile.getAccountId();
    dto.fullName = userProfile.getDisplayName().toString();
    dto.email = account.getEmail().toString();
    dto.phoneNumber = userProfile.getPhoneNumber();
    dto.licenseNumber = profile.getLicenseNumber();
    dto.specialty = profile.getSpecialty();
    dto.biography = profile.getBiography();
    dto.yearsOfExperience = profile.getYearsOfExperience();
    dto.languages = profile.getLanguages();
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
    dto.createdAt = profile.getCreatedAt().toISOString();
    dto.updatedAt = profile.getUpdatedAt().toISOString();

    return dto;
  }
}
