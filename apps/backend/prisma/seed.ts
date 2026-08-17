/**
 * Demo Data & Profile Avatar Pass -- the Prisma seed script.
 *
 * Every row this script creates is created by driving the REAL application-
 * layer use cases, resolved out of a real Nest DI container. Nothing here
 * touches `prisma.x.create()` directly, and nothing here writes a
 * Notification row: notifications appear because NotificationModule's event
 * handlers -- which only subscribe when Nest instantiates that module's
 * providers -- observe the same domain events a real request would raise.
 * That is exactly why this boots `NestFactory.createApplicationContext(...)`
 * instead of hand-constructing use cases with `new`.
 *
 * Idempotent: accounts are skipped when an Account with that email already
 * exists, reference data is found-or-created by name, and the appointment
 * phase is skipped for any patient who already has appointments. Running it
 * twice creates no duplicate rows.
 *
 * Run with: `npm run seed` (from apps/backend), or `npx prisma db seed`.
 */
import 'reflect-metadata';

import { randomUUID } from 'node:crypto';

import { NestFactory } from '@nestjs/core';

import { AppModule } from '../src/app.module.js';
import { MEDIA_ASSET_REPOSITORY } from '../src/modules/asset/application/ports/tokens.js';
import { MediaAsset } from '../src/modules/asset/domain/entities/media-asset.entity.js';
import { MediaAssetPurpose } from '../src/modules/asset/domain/enums/media-asset-purpose.enum.js';
import type { MediaAssetRepository } from '../src/modules/asset/domain/repositories/media-asset.repository.js';
import { CreateHospitalCommand } from '../src/modules/administration/application/use-cases/create-hospital/create-hospital.command.js';
import { CreateHospitalUseCase } from '../src/modules/administration/application/use-cases/create-hospital/create-hospital.use-case.js';
import { ListHospitalsUseCase } from '../src/modules/administration/application/use-cases/list-hospitals/list-hospitals.use-case.js';
import { CREDENTIAL_REPOSITORY } from '../src/modules/authentication/application/ports/tokens.js';
import { RegisterCommand } from '../src/modules/authentication/application/use-cases/register/register.command.js';
import { RegisterUseCase } from '../src/modules/authentication/application/use-cases/register/register.use-case.js';
import type { CredentialRepository } from '../src/modules/authentication/domain/repositories/credential.repository.js';
import { BookAppointmentCommand } from '../src/modules/consultation/application/use-cases/book-appointment/book-appointment.command.js';
import { BookAppointmentUseCase } from '../src/modules/consultation/application/use-cases/book-appointment/book-appointment.use-case.js';
import { CloseConsultationCommand } from '../src/modules/consultation/application/use-cases/close-consultation/close-consultation.command.js';
import { CloseConsultationUseCase } from '../src/modules/consultation/application/use-cases/close-consultation/close-consultation.use-case.js';
import { ConfirmAppointmentCommand } from '../src/modules/consultation/application/use-cases/confirm-appointment/confirm-appointment.command.js';
import { ConfirmAppointmentUseCase } from '../src/modules/consultation/application/use-cases/confirm-appointment/confirm-appointment.use-case.js';
import { GetAppointmentByIdUseCase } from '../src/modules/consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByAppointmentIdUseCase } from '../src/modules/consultation/application/use-cases/get-consultation-session-by-appointment-id/get-consultation-session-by-appointment-id.use-case.js';
import { ListAppointmentsForPatientUseCase } from '../src/modules/consultation/application/use-cases/list-appointments-for-patient/list-appointments-for-patient.use-case.js';
import { RescheduleOrCancelAppointmentCommand } from '../src/modules/consultation/application/use-cases/reschedule-or-cancel-appointment/reschedule-or-cancel-appointment.command.js';
import { RescheduleOrCancelAppointmentUseCase } from '../src/modules/consultation/application/use-cases/reschedule-or-cancel-appointment/reschedule-or-cancel-appointment.use-case.js';
import { StartConsultationCommand } from '../src/modules/consultation/application/use-cases/start-consultation/start-consultation.command.js';
import { StartConsultationUseCase } from '../src/modules/consultation/application/use-cases/start-consultation/start-consultation.use-case.js';
import { SubmitConsultationFeedbackCommand } from '../src/modules/consultation/application/use-cases/submit-consultation-feedback/submit-consultation-feedback.command.js';
import { SubmitConsultationFeedbackUseCase } from '../src/modules/consultation/application/use-cases/submit-consultation-feedback/submit-consultation-feedback.use-case.js';
import type { Appointment } from '../src/modules/consultation/domain/entities/appointment.entity.js';
import { AppointmentStatus } from '../src/modules/consultation/domain/enums/appointment-status.enum.js';
import { ConsultationCompletionReason } from '../src/modules/consultation/domain/enums/consultation-completion-reason.enum.js';
import { DefineAvailabilityWindowCommand } from '../src/modules/doctor/application/use-cases/define-availability-window/define-availability-window.command.js';
import { DefineAvailabilityWindowUseCase } from '../src/modules/doctor/application/use-cases/define-availability-window/define-availability-window.use-case.js';
import { GetDoctorProfileByAccountIdUseCase } from '../src/modules/doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { ListAvailabilityWindowsForDoctorQuery } from '../src/modules/doctor/application/use-cases/list-availability-windows-for-doctor/list-availability-windows-for-doctor.query.js';
import { ListAvailabilityWindowsForDoctorUseCase } from '../src/modules/doctor/application/use-cases/list-availability-windows-for-doctor/list-availability-windows-for-doctor.use-case.js';
import { RegisterDoctorProfileCommand } from '../src/modules/doctor/application/use-cases/register-doctor-profile/register-doctor-profile.command.js';
import { RegisterDoctorProfileUseCase } from '../src/modules/doctor/application/use-cases/register-doctor-profile/register-doctor-profile.use-case.js';
import { AvailabilityWindowStatus } from '../src/modules/doctor/domain/enums/availability-window-status.enum.js';
import { ProfessionalRank } from '../src/modules/doctor/domain/enums/professional-rank.enum.js';
import { ConsultationPricing } from '../src/modules/doctor/domain/value-objects/consultation-pricing.value-object.js';
import { Money } from '../src/modules/doctor/domain/value-objects/money.value-object.js';
import { GetAccountByEmailUseCase } from '../src/modules/identity/application/use-cases/get-account-by-email/get-account-by-email.use-case.js';
import { UpdateAccountRoleCommand } from '../src/modules/identity/application/use-cases/update-account-role/update-account-role.command.js';
import { UpdateAccountRoleUseCase } from '../src/modules/identity/application/use-cases/update-account-role/update-account-role.use-case.js';
import { UpdatePersonalProfileCommand } from '../src/modules/identity/application/use-cases/update-personal-profile/update-personal-profile.command.js';
import { UpdatePersonalProfileUseCase } from '../src/modules/identity/application/use-cases/update-personal-profile/update-personal-profile.use-case.js';
import { AccountRole } from '../src/modules/identity/domain/enums/account-role.enum.js';
import { Gender } from '../src/modules/identity/domain/enums/gender.enum.js';
import { CreatePatientProfileCommand } from '../src/modules/patient/application/use-cases/create-patient-profile/create-patient-profile.command.js';
import { CreatePatientProfileUseCase } from '../src/modules/patient/application/use-cases/create-patient-profile/create-patient-profile.use-case.js';
import { GetPatientProfileByAccountIdUseCase } from '../src/modules/patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { UpdatePatientProfileCommand } from '../src/modules/patient/application/use-cases/update-patient-profile/update-patient-profile.command.js';
import { UpdatePatientProfileUseCase } from '../src/modules/patient/application/use-cases/update-patient-profile/update-patient-profile.use-case.js';
import { BloodType } from '../src/modules/patient/domain/enums/blood-type.enum.js';
import { EmergencyRelationship } from '../src/modules/patient/domain/enums/emergency-relationship.enum.js';
import { InitiateChargeCommand } from '../src/modules/payment/application/use-cases/initiate-charge/initiate-charge.command.js';
import { InitiateChargeUseCase } from '../src/modules/payment/application/use-cases/initiate-charge/initiate-charge.use-case.js';
import { PaymentMethod } from '../src/modules/payment/domain/enums/payment-method.enum.js';
import { CreateCountryCommand } from '../src/modules/reference/application/use-cases/create-country/create-country.command.js';
import { CreateCountryUseCase } from '../src/modules/reference/application/use-cases/create-country/create-country.use-case.js';
import { CreateInsuranceProviderCommand } from '../src/modules/reference/application/use-cases/create-insurance-provider/create-insurance-provider.command.js';
import { CreateInsuranceProviderUseCase } from '../src/modules/reference/application/use-cases/create-insurance-provider/create-insurance-provider.use-case.js';
import { CreateMedicalSpecialtyCommand } from '../src/modules/reference/application/use-cases/create-medical-specialty/create-medical-specialty.command.js';
import { CreateMedicalSpecialtyUseCase } from '../src/modules/reference/application/use-cases/create-medical-specialty/create-medical-specialty.use-case.js';
import { ListCountriesUseCase } from '../src/modules/reference/application/use-cases/list-countries/list-countries.use-case.js';
import { ListInsuranceProvidersUseCase } from '../src/modules/reference/application/use-cases/list-insurance-providers/list-insurance-providers.use-case.js';
import { ListMedicalSpecialtiesUseCase } from '../src/modules/reference/application/use-cases/list-medical-specialties/list-medical-specialties.use-case.js';
import { UpdateDoctorWorkingHoursCommand } from '../src/modules/scheduling/application/use-cases/update-doctor-working-hours/update-doctor-working-hours.command.js';
import type { WorkingHoursDayInput } from '../src/modules/scheduling/application/use-cases/update-doctor-working-hours/update-doctor-working-hours.command.js';
import { UpdateDoctorWorkingHoursUseCase } from '../src/modules/scheduling/application/use-cases/update-doctor-working-hours/update-doctor-working-hours.use-case.js';
import { WeekDay, ALL_WEEK_DAYS } from '../src/modules/scheduling/domain/enums/week-day.enum.js';
import { ConsultationPricing as SchedulingConsultationPricing } from '../src/modules/scheduling/domain/value-objects/consultation-pricing.value-object.js';
import { Money as SchedulingMoney } from '../src/modules/scheduling/domain/value-objects/money.value-object.js';
import { DecideVerificationCommand } from '../src/modules/trust/application/use-cases/decide-verification/decide-verification.command.js';
import { DecideVerificationUseCase } from '../src/modules/trust/application/use-cases/decide-verification/decide-verification.use-case.js';
import { SubmitDoctorVerificationCommand } from '../src/modules/trust/application/use-cases/submit-doctor-verification/submit-doctor-verification.command.js';
import { SubmitDoctorVerificationUseCase } from '../src/modules/trust/application/use-cases/submit-doctor-verification/submit-doctor-verification.use-case.js';
import { SubmitPatientVerificationCommand } from '../src/modules/trust/application/use-cases/submit-patient-verification/submit-patient-verification.command.js';
import { SubmitPatientVerificationUseCase } from '../src/modules/trust/application/use-cases/submit-patient-verification/submit-patient-verification.use-case.js';
import { SuspendVerificationCaseCommand } from '../src/modules/trust/application/use-cases/suspend-verification-case/suspend-verification-case.command.js';
import { SuspendVerificationCaseUseCase } from '../src/modules/trust/application/use-cases/suspend-verification-case/suspend-verification-case.use-case.js';
import { VerificationStatus } from '../src/modules/trust/domain/enums/verification-status.enum.js';

import {
  DEMO_DOCTORS,
  DEMO_DOCTORS_WITH_NO_CANCELLATIONS,
  DEMO_HOSPITAL_ADMIN,
  DEMO_HOSPITALS,
  DEMO_INSURANCE_PROVIDERS,
  DEMO_PASSWORD,
  DEMO_PATIENTS,
  DEMO_PATIENTS_WITH_NO_APPOINTMENTS,
  DEMO_SUPER_ADMIN,
} from './demo-data/demo-people.js';
import type { DemoDoctor, DemoGender, DemoPatient } from './demo-data/demo-people.js';

// ---------------------------------------------------------------------------
// Deterministic pseudo-randomness
// ---------------------------------------------------------------------------
// A fixed seed keeps every run of this script producing the same "random"
// mix of outcomes -- a demo dataset that changes shape run-to-run is much
// harder to talk about, screenshot, and debug than a stable one.
let randomState = 0x5eed1234;

function nextRandom(): number {
  randomState |= 0;
  randomState = (randomState + 0x6d2b79f5) | 0;
  let t = Math.imul(randomState ^ (randomState >>> 15), 1 | randomState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function randomInt(minInclusive: number, maxInclusive: number): number {
  return minInclusive + Math.floor(nextRandom() * (maxInclusive - minInclusive + 1));
}

function pick<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)];
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
const MS_PER_DAY = 86_400_000;

function yearsFromNow(years: number): Date {
  const date = new Date();
  date.setFullYear(date.getFullYear() + years);
  return date;
}

function yearsAgo(years: number): Date {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date;
}

function monthsAgo(months: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
}

function toGender(gender: DemoGender): Gender {
  return gender === 'male' ? Gender.Male : Gender.Female;
}

function toProfessionalRank(rank: DemoDoctor['professionalRank']): ProfessionalRank {
  switch (rank) {
    case 'resident':
      return ProfessionalRank.Resident;
    case 'registrar':
      return ProfessionalRank.Registrar;
    case 'specialist':
      return ProfessionalRank.Specialist;
    case 'consultant':
      return ProfessionalRank.Consultant;
    case 'professor':
      return ProfessionalRank.Professor;
  }
}

function toEmergencyRelationship(relationship: DemoPatient['emergencyContactRelationship']): EmergencyRelationship {
  switch (relationship) {
    case 'parent':
      return EmergencyRelationship.Parent;
    case 'spouse':
      return EmergencyRelationship.Spouse;
    case 'sibling':
      return EmergencyRelationship.Sibling;
    case 'child':
      return EmergencyRelationship.Child;
    case 'guardian':
      return EmergencyRelationship.Guardian;
    case 'other':
      return EmergencyRelationship.Other;
  }
}

function toBloodType(bloodType: string | undefined): BloodType | undefined {
  if (!bloodType) return undefined;
  const match = Object.values(BloodType).find((value) => value === bloodType);
  return match;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const FEEDBACK_COMMENTS = [
  'Very attentive and explained everything clearly. Highly recommended.',
  'The consultation started on time and all my questions were answered.',
  'Professional and reassuring. I felt genuinely listened to.',
  'Clear treatment plan and a helpful follow-up summary.',
  'Good experience overall, though the call quality dropped briefly.',
  'Kind and thorough. I will definitely book again.',
];

const REASONS_FOR_VISIT = [
  'Follow-up consultation',
  'Ongoing symptoms review',
  'Second opinion on current treatment',
  'Routine check-up',
  'Medication review',
  'New symptoms in the last two weeks',
];

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------
interface SeededDoctor {
  demo: DemoDoctor;
  accountId: string;
  doctorProfileId: string;
  openWindowIds: string[];
}

interface SeededPatient {
  demo: DemoPatient;
  accountId: string;
  patientProfileId: string;
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['warn', 'error'] });

  try {
    // -- Resolve every use case out of the real DI container. Resolving them
    // this way (rather than `new`-ing them) is what guarantees
    // NotificationModule's event handlers are subscribed and therefore that
    // real Notification rows appear as a side effect of the flows below.
    const getAccountByEmail = app.get(GetAccountByEmailUseCase);
    const register = app.get(RegisterUseCase);
    const updateAccountRole = app.get(UpdateAccountRoleUseCase);
    const updatePersonalProfile = app.get(UpdatePersonalProfileUseCase);
    const credentialRepository = app.get<CredentialRepository>(CREDENTIAL_REPOSITORY);
    const mediaAssetRepository = app.get<MediaAssetRepository>(MEDIA_ASSET_REPOSITORY);

    const listMedicalSpecialties = app.get(ListMedicalSpecialtiesUseCase);
    const createMedicalSpecialty = app.get(CreateMedicalSpecialtyUseCase);
    const listInsuranceProviders = app.get(ListInsuranceProvidersUseCase);
    const createInsuranceProvider = app.get(CreateInsuranceProviderUseCase);
    const listCountries = app.get(ListCountriesUseCase);
    const createCountry = app.get(CreateCountryUseCase);
    const listHospitals = app.get(ListHospitalsUseCase);
    const createHospital = app.get(CreateHospitalUseCase);

    const registerDoctorProfile = app.get(RegisterDoctorProfileUseCase);
    const getDoctorProfileByAccountId = app.get(GetDoctorProfileByAccountIdUseCase);
    const defineAvailabilityWindow = app.get(DefineAvailabilityWindowUseCase);
    const listAvailabilityWindowsForDoctor = app.get(ListAvailabilityWindowsForDoctorUseCase);
    const updateDoctorWorkingHours = app.get(UpdateDoctorWorkingHoursUseCase);

    const createPatientProfile = app.get(CreatePatientProfileUseCase);
    const updatePatientProfile = app.get(UpdatePatientProfileUseCase);
    const getPatientProfileByAccountId = app.get(GetPatientProfileByAccountIdUseCase);

    const submitDoctorVerification = app.get(SubmitDoctorVerificationUseCase);
    const submitPatientVerification = app.get(SubmitPatientVerificationUseCase);
    const decideVerification = app.get(DecideVerificationUseCase);
    const suspendVerificationCase = app.get(SuspendVerificationCaseUseCase);

    const bookAppointment = app.get(BookAppointmentUseCase);
    const confirmAppointment = app.get(ConfirmAppointmentUseCase);
    const getAppointmentById = app.get(GetAppointmentByIdUseCase);
    const getSessionByAppointmentId = app.get(GetConsultationSessionByAppointmentIdUseCase);
    const listAppointmentsForPatient = app.get(ListAppointmentsForPatientUseCase);
    const startConsultation = app.get(StartConsultationUseCase);
    const closeConsultation = app.get(CloseConsultationUseCase);
    const submitConsultationFeedback = app.get(SubmitConsultationFeedbackUseCase);
    const rescheduleOrCancelAppointment = app.get(RescheduleOrCancelAppointmentUseCase);
    const initiateCharge = app.get(InitiateChargeUseCase);

    // -----------------------------------------------------------------
    // 1. Reference data (idempotent, found-or-created by name)
    // -----------------------------------------------------------------
    const specialtyIdsByName = new Map<string, string>();
    for (const specialty of await listMedicalSpecialties.execute()) {
      specialtyIdsByName.set(specialty.getName(), specialty.getId());
    }
    for (const name of new Set(DEMO_DOCTORS.map((doctor) => doctor.specialtyName))) {
      if (specialtyIdsByName.has(name)) continue;
      const created = await createMedicalSpecialty.execute(new CreateMedicalSpecialtyCommand({ name }));
      specialtyIdsByName.set(created.getName(), created.getId());
      console.info(`  + specialty "${name}"`);
    }

    const hospitalIdsByName = new Map<string, string>();
    for (const hospital of await listHospitals.execute()) {
      if (!hospitalIdsByName.has(hospital.getName())) {
        hospitalIdsByName.set(hospital.getName(), hospital.getId());
      }
    }
    for (const name of DEMO_HOSPITALS) {
      if (hospitalIdsByName.has(name)) continue;
      const created = await createHospital.execute(new CreateHospitalCommand({ name, address: 'Cairo, Egypt' }));
      hospitalIdsByName.set(created.getName(), created.getId());
      console.info(`  + hospital "${name}"`);
    }

    const insuranceIdsByName = new Map<string, string>();
    for (const provider of await listInsuranceProviders.execute()) {
      insuranceIdsByName.set(provider.getName(), provider.getId());
    }
    for (const name of DEMO_INSURANCE_PROVIDERS) {
      if (insuranceIdsByName.has(name)) continue;
      const created = await createInsuranceProvider.execute(new CreateInsuranceProviderCommand({ name }));
      insuranceIdsByName.set(created.getName(), created.getId());
      console.info(`  + insurance provider "${name}"`);
    }

    let egyptId: string | undefined;
    const existingEgypt = (await listCountries.execute()).find((country) => country.getName() === 'Egypt');
    if (existingEgypt) {
      egyptId = existingEgypt.getId();
    } else {
      const created = await createCountry.execute(new CreateCountryCommand({ name: 'Egypt', iso2Code: 'EG' }));
      egyptId = created.getId();
      console.info('  + country "Egypt"');
    }

    // -----------------------------------------------------------------
    // Shared account helpers
    // -----------------------------------------------------------------
    /**
     * Registers an Account + Credential through AuthenticationModule's real
     * signup use case (the same one `POST /auth/register` calls), then
     * elevates the role where needed -- self-registration always produces a
     * Patient by design, so Doctor/Admin roles go through IdentityModule's
     * own UpdateAccountRoleUseCase rather than being faked at insert time.
     *
     * Returns `created: false` when the email already exists, which is what
     * makes the whole script idempotent.
     */
    async function ensureAccount(
      email: string,
      displayName: string,
      role: AccountRole,
    ): Promise<{ accountId: string; created: boolean }> {
      const existing = await getAccountByEmail.execute({ email });
      if (existing) {
        return { accountId: existing.getId().toString(), created: false };
      }

      const result = await register.execute(
        new RegisterCommand({ fullName: displayName, email, password: DEMO_PASSWORD }),
      );

      if (role !== AccountRole.Patient) {
        await updateAccountRole.execute(new UpdateAccountRoleCommand({ accountId: result.accountId, newRole: role }));
      }

      // Demo accounts must actually be able to log in. The real flow needs
      // the emailed token, which a seed script can't consume, so this marks
      // the Credential verified through the aggregate's own behaviour +
      // repository -- never a raw column write.
      const credential = await credentialRepository.findByAccountId(result.accountId);
      if (credential && !credential.isEmailVerified()) {
        credential.verifyEmail();
        await credentialRepository.save(credential);
      }

      return { accountId: result.accountId, created: true };
    }

    /**
     * Verification cases genuinely require at least one document asset
     * (VerificationCase.submit() enforces it, and VerificationDocument has a
     * real FK to MediaAsset). This creates the upload-intent metadata row
     * through the MediaAsset aggregate + its repository -- deliberately NOT
     * through CreateUploadIntentUseCase, which would also try to presign an
     * S3 URL that a local demo environment has no bucket for.
     */
    async function createDemoDocument(ownerAccountId: string, purpose: MediaAssetPurpose): Promise<string> {
      const asset = MediaAsset.createIntent({
        ownerAccountId,
        purpose,
        contentType: 'image/png',
        sizeEstimate: 245_760,
      });
      asset.confirm();
      await mediaAssetRepository.save(asset);
      return asset.getId();
    }

    // -----------------------------------------------------------------
    // 2. Admin accounts
    // -----------------------------------------------------------------
    console.info('Seeding admin accounts...');
    await ensureAccount(DEMO_SUPER_ADMIN.email, DEMO_SUPER_ADMIN.displayName, AccountRole.SuperAdmin);
    await ensureAccount(DEMO_HOSPITAL_ADMIN.email, DEMO_HOSPITAL_ADMIN.displayName, AccountRole.HospitalAdmin);

    // -----------------------------------------------------------------
    // 3. Doctors
    // -----------------------------------------------------------------
    console.info('Seeding doctors...');
    for (const demo of DEMO_DOCTORS) {
      try {
        const { accountId, created } = await ensureAccount(demo.email, demo.displayName, AccountRole.Doctor);
        if (!created) continue;

        await updatePersonalProfile.execute(
          new UpdatePersonalProfileCommand({
            accountId,
            avatarUrl: demo.avatarUrl,
            gender: toGender(demo.gender),
            nationalityId: egyptId,
          }),
        );

        const specialtyId = specialtyIdsByName.get(demo.specialtyName);
        if (!specialtyId) {
          console.warn(`  ! ${demo.email}: unknown specialty "${demo.specialtyName}", skipping.`);
          continue;
        }

        const profile = await registerDoctorProfile.execute(
          new RegisterDoctorProfileCommand({
            accountId,
            licenseNumber: demo.licenseNumber,
            biography: demo.biography,
            yearsOfExperience: demo.yearsOfExperience,
            languages: demo.languages,
            insuranceProviders: demo.insuranceProviders,
            consultationFeeAmount: demo.consultationFeeAmount,
            hospitalId: demo.hospitalName ? hospitalIdsByName.get(demo.hospitalName) : undefined,
            publications: demo.publications.map((publication) => ({
              title: publication.title,
              reference: publication.reference,
              publishedAt: monthsAgo(publication.monthsAgo),
            })),
            awards: demo.awards.map((award) => ({
              title: award.title,
              issuingBody: award.issuingBody,
              awardedAt: monthsAgo(award.monthsAgo),
            })),
            workExperience: demo.workExperience.map((experience) => ({
              organizationName: experience.organizationName,
              position: experience.position,
              startDate: yearsAgo(experience.yearsAgo),
              endDate:
                experience.yearsAgo > experience.yearsDuration
                  ? yearsAgo(experience.yearsAgo - experience.yearsDuration)
                  : undefined,
            })),
            specialtyId,
            professionalRank: toProfessionalRank(demo.professionalRank),
            licenseExpiryDate: yearsFromNow(demo.licenseExpiryYearsFromNow),
          }),
        );

        const licenseDocumentId = await createDemoDocument(accountId, MediaAssetPurpose.MedicalLicense);
        const verificationCase = await submitDoctorVerification.execute(
          new SubmitDoctorVerificationCommand({
            doctorId: profile.getId(),
            subjectAccountId: accountId,
            licenseNumber: demo.licenseNumber,
            specialtyCode: demo.specialtyName,
            documentAssetIds: [licenseDocumentId],
          }),
        );

        // 'pending' deliberately gets NO decision call at all -- Pending is
        // simply the state a just-submitted case is already in.
        if (demo.verification === 'approved') {
          await decideVerification.execute(
            new DecideVerificationCommand({
              verificationCaseId: verificationCase.getId(),
              status: VerificationStatus.Approved,
              reason: 'Credentials verified against the Egyptian Medical Syndicate register.',
            }),
          );
        } else if (demo.verification === 'rejected') {
          await decideVerification.execute(
            new DecideVerificationCommand({
              verificationCaseId: verificationCase.getId(),
              status: VerificationStatus.Rejected,
              reason: 'The uploaded medical licence has expired. Please resubmit with a current licence.',
            }),
          );
        }

        // Only an approved doctor has a real practice: working hours and
        // bookable slots would be meaningless for a pending/rejected one.
        if (demo.verification !== 'approved') continue;

        await updateDoctorWorkingHours.execute(
          new UpdateDoctorWorkingHoursCommand({
            doctorId: profile.getId(),
            days: buildWorkingHours(demo.consultationFeeAmount),
          }),
        );

        const pricing = demo.consultationFeeAmount
          ? ConsultationPricing.paid(Money.create(demo.consultationFeeAmount, 'EGP'))
          : ConsultationPricing.free();
        // Psychiatry deliberately carries far more open capacity than every
        // other specialty -- that (not a hardcoded "popular" flag) is what
        // makes it organically the busiest specialty once bookings land.
        const windowCount = demo.specialtyName === 'Psychiatry' ? 10 : 5;
        for (const startTime of buildWindowStartTimes(windowCount)) {
          try {
            await defineAvailabilityWindow.execute(
              new DefineAvailabilityWindowCommand({
                doctorId: profile.getId(),
                startTime,
                endTime: new Date(startTime.getTime() + 30 * 60_000),
                pricing,
              }),
            );
          } catch (error) {
            console.warn(`  ! ${demo.email}: availability window skipped (${describeError(error)})`);
          }
        }

        console.info(`  + doctor ${demo.email} (${demo.verification})`);
      } catch (error) {
        console.warn(`  ! doctor ${demo.email} failed: ${describeError(error)}`);
      }
    }

    // -----------------------------------------------------------------
    // 4. Patients
    // -----------------------------------------------------------------
    console.info('Seeding patients...');
    const insuranceIds = [...insuranceIdsByName.values()];
    for (const demo of DEMO_PATIENTS) {
      try {
        const { accountId, created } = await ensureAccount(demo.email, demo.displayName, AccountRole.Patient);
        if (!created) continue;

        await updatePersonalProfile.execute(
          new UpdatePersonalProfileCommand({
            accountId,
            avatarUrl: demo.avatarUrl,
            gender: toGender(demo.gender),
            dateOfBirth: yearsAgo(demo.dateOfBirthYearsAgo),
            nationalityId: egyptId,
          }),
        );

        const profile = await createPatientProfile.execute(
          new CreatePatientProfileCommand({
            accountId,
            emergencyContacts: [
              {
                name: demo.emergencyContactName,
                relationship: toEmergencyRelationship(demo.emergencyContactRelationship),
                phoneNumber: demo.emergencyContactPhone,
              },
            ],
          }),
        );

        await updatePatientProfile.execute(
          new UpdatePatientProfileCommand({
            patientProfileId: profile.getId(),
            bloodType: toBloodType(demo.bloodType),
            allergies: demo.allergies,
            chronicDiseases: demo.chronicDiseases,
            insuranceProviderId: demo.hasInsurance && insuranceIds.length > 0 ? pick(insuranceIds) : undefined,
          }),
        );

        const idFrontId = await createDemoDocument(accountId, MediaAssetPurpose.NationalIdFront);
        const selfieId = await createDemoDocument(accountId, MediaAssetPurpose.SelfieWithId);
        const verificationCase = await submitPatientVerification.execute(
          new SubmitPatientVerificationCommand({
            patientProfileId: profile.getId(),
            subjectAccountId: accountId,
            documentAssetIds: [idFrontId, selfieId],
          }),
        );

        if (demo.verification === 'approved' || demo.verification === 'suspended') {
          await decideVerification.execute(
            new DecideVerificationCommand({
              verificationCaseId: verificationCase.getId(),
              status: VerificationStatus.Approved,
              reason: 'National ID and selfie matched.',
            }),
          );
        }
        // Suspension is only ever reachable from Approved, so it follows the
        // approval above rather than replacing it.
        if (demo.verification === 'suspended') {
          await suspendVerificationCase.execute(
            new SuspendVerificationCaseCommand({
              verificationCaseId: verificationCase.getId(),
              reason: 'Identity document flagged for manual re-review.',
            }),
          );
        }

        console.info(`  + patient ${demo.email} (${demo.verification})`);
      } catch (error) {
        console.warn(`  ! patient ${demo.email} failed: ${describeError(error)}`);
      }
    }

    // -----------------------------------------------------------------
    // 5. Resolve the seeded population (works on a re-run too)
    // -----------------------------------------------------------------
    const doctors: SeededDoctor[] = [];
    const windowSearchFrom = new Date(Date.now() - MS_PER_DAY);
    const windowSearchTo = new Date(Date.now() + 60 * MS_PER_DAY);
    for (const demo of DEMO_DOCTORS) {
      if (demo.verification !== 'approved') continue;
      const account = await getAccountByEmail.execute({ email: demo.email });
      if (!account) continue;
      const profile = await getDoctorProfileByAccountId.execute({ accountId: account.getId().toString() });
      if (!profile) continue;
      const windows = await listAvailabilityWindowsForDoctor.execute(
        new ListAvailabilityWindowsForDoctorQuery({
          doctorId: profile.getId(),
          from: windowSearchFrom,
          to: windowSearchTo,
        }),
      );
      doctors.push({
        demo,
        accountId: account.getId().toString(),
        doctorProfileId: profile.getId(),
        openWindowIds: windows
          .filter((window) => window.getStatus() === AvailabilityWindowStatus.Open)
          .map((window) => window.getId()),
      });
    }

    const patients: SeededPatient[] = [];
    for (const demo of DEMO_PATIENTS) {
      if (DEMO_PATIENTS_WITH_NO_APPOINTMENTS.has(demo.email)) continue;
      const account = await getAccountByEmail.execute({ email: demo.email });
      if (!account) continue;
      const profile = await getPatientProfileByAccountId.execute({ accountId: account.getId().toString() });
      if (!profile) continue;
      patients.push({ demo, accountId: account.getId().toString(), patientProfileId: profile.getId() });
    }

    const psychiatrists = doctors.filter((doctor) => doctor.demo.specialtyName === 'Psychiatry');
    const otherDoctors = doctors.filter((doctor) => doctor.demo.specialtyName !== 'Psychiatry');

    function takeWindow(doctor: SeededDoctor): string | undefined {
      return doctor.openWindowIds.shift();
    }

    function pickDoctorWithCapacity(): SeededDoctor | undefined {
      // 60% of all bookings are biased toward Psychiatry -- the same
      // weighted-generation principle behind the extra windows above.
      const preferPsychiatry = nextRandom() < 0.6;
      const primary = preferPsychiatry ? psychiatrists : otherDoctors;
      const fallback = preferPsychiatry ? otherDoctors : psychiatrists;
      const available = primary.filter((doctor) => doctor.openWindowIds.length > 0);
      if (available.length > 0) return pick(available);
      const alternatives = fallback.filter((doctor) => doctor.openWindowIds.length > 0);
      return alternatives.length > 0 ? pick(alternatives) : undefined;
    }

    /**
     * Pay for (or, when no payment gateway is configured in this
     * environment, doctor-approve) a Requested appointment so it reaches
     * Confirmed with an open ConsultationSession. Both are real paths the
     * running application uses: InitiateChargeUseCase confirms internally on
     * a successful charge; ConfirmAppointmentUseCase is what the doctor's
     * own approval action calls.
     */
    async function confirmViaPaymentOrApproval(appointment: Appointment): Promise<string | undefined> {
      const fee = appointment.getPricing().getFee();
      if (fee) {
        try {
          await initiateCharge.execute(
            new InitiateChargeCommand({
              idempotencyKey: randomUUID(),
              appointmentId: appointment.getId(),
              amount: fee.getAmount(),
              currency: fee.getCurrency(),
              paymentMethod: PaymentMethod.Card,
              paymentMethodToken: 'pm_card_visa',
            }),
          );
        } catch (error) {
          console.warn(`  ! charge unavailable, falling back to doctor approval (${describeError(error)})`);
        }
      }

      const current = await getAppointmentById.execute({ appointmentId: appointment.getId() });
      if (current?.getStatus() === AppointmentStatus.Requested) {
        const result = await confirmAppointment.execute(
          new ConfirmAppointmentCommand({ appointmentId: appointment.getId() }),
        );
        return result.session.getId();
      }

      const session = await getSessionByAppointmentId.execute({ appointmentId: appointment.getId() });
      return session?.getId();
    }

    // -----------------------------------------------------------------
    // 6. Appointments / consultations / payments / feedback
    // -----------------------------------------------------------------
    console.info('Seeding appointments...');
    for (const patient of patients) {
      const existingAppointments = await listAppointmentsForPatient.execute({ patientId: patient.patientProfileId });
      if (existingAppointments.length > 0) continue; // already seeded on a previous run

      const bookingCount = randomInt(2, 5);
      for (let index = 0; index < bookingCount; index += 1) {
        const doctor = pickDoctorWithCapacity();
        if (!doctor) break;
        const windowId = takeWindow(doctor);
        if (!windowId) continue;

        try {
          const appointment = await bookAppointment.execute(
            new BookAppointmentCommand({
              patientId: patient.patientProfileId,
              doctorId: doctor.doctorProfileId,
              availabilityWindowId: windowId,
              reasonForVisit: pick(REASONS_FOR_VISIT),
            }),
          );

          const roll = nextRandom();
          if (roll < 0.5) {
            // -- Completed with feedback
            const sessionId = await confirmViaPaymentOrApproval(appointment);
            if (!sessionId) throw new Error('no consultation session was opened');
            await startConsultation.execute(new StartConsultationCommand({ consultationSessionId: sessionId }));
            await closeConsultation.execute(
              new CloseConsultationCommand({
                consultationSessionId: sessionId,
                completionReason: ConsultationCompletionReason.Completed,
              }),
            );
            await submitConsultationFeedback.execute(
              new SubmitConsultationFeedbackCommand({
                consultationSessionId: sessionId,
                patientAccountId: patient.accountId,
                rating: ratingFor(doctor.demo),
                comment: nextRandom() < 0.6 ? pick(FEEDBACK_COMMENTS) : undefined,
              }),
            );
          } else if (roll < 0.75) {
            // -- Confirmed / upcoming
            await confirmViaPaymentOrApproval(appointment);
          } else if (roll < 0.85) {
            // -- Requested / awaiting the doctor's confirmation
            continue;
          } else if (roll < 0.95) {
            // -- Cancelled. Doctors flagged as never cancelling only ever
            // see the patient-initiated variant.
            const initiatedByRole = DEMO_DOCTORS_WITH_NO_CANCELLATIONS.has(doctor.demo.email)
              ? 'patient'
              : pick<'doctor' | 'patient'>(['doctor', 'patient']);
            await rescheduleOrCancelAppointment.execute(
              new RescheduleOrCancelAppointmentCommand({
                appointmentId: appointment.getId(),
                action: 'cancel',
                initiatedByRole,
              }),
            );
          } else {
            // -- Rescheduled onto another real open window for the same doctor
            const newWindowId = takeWindow(doctor);
            if (!newWindowId) continue;
            await rescheduleOrCancelAppointment.execute(
              new RescheduleOrCancelAppointmentCommand({
                appointmentId: appointment.getId(),
                action: 'reschedule',
                newAvailabilityWindowId: newWindowId,
                initiatedByRole: 'patient',
              }),
            );
          }
        } catch (error) {
          // A random combination can legitimately hit a domain guard (a slot
          // that lapsed, a doctor that ran out of capacity). Log and keep
          // going -- the rest of the dataset is still worth creating.
          console.warn(`  ! appointment for ${patient.demo.email} skipped: ${describeError(error)}`);
        }
      }
      console.info(`  + appointments for ${patient.demo.email}`);
    }

    console.info('Seed complete.');
  } finally {
    await app.close();
  }
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------
/** Standard Egyptian working week: Sunday-Thursday 09:00-17:00, Friday/Saturday closed. */
function buildWorkingHours(consultationFeeAmount: number | undefined): WorkingHoursDayInput[] {
  const pricing = consultationFeeAmount
    ? SchedulingConsultationPricing.paid(SchedulingMoney.create(consultationFeeAmount, 'EGP'))
    : SchedulingConsultationPricing.free();

  return ALL_WEEK_DAYS.map((dayOfWeek) => {
    const isWorkingDay = dayOfWeek !== WeekDay.Friday && dayOfWeek !== WeekDay.Saturday;
    return {
      dayOfWeek,
      isWorkingDay,
      hours: { start: '09:00', end: '17:00' },
      breaks: isWorkingDay ? [{ start: '13:00', end: '14:00' }] : [],
      pricing,
    };
  });
}

/**
 * Concrete 30-minute slots over the next two weeks, on days and hours
 * consistent with the working-hours template above. AvailabilityWindow
 * .define() rejects a start time in the past, so these are always future
 * slots -- see the seed's own README note about completed history therefore
 * being scheduled slightly ahead of "now".
 */
function buildWindowStartTimes(count: number): Date[] {
  const hours = [9, 10, 11, 14, 15, 16];
  const starts: Date[] = [];
  const now = new Date();

  for (let dayOffset = 1; dayOffset <= 14 && starts.length < count; dayOffset += 1) {
    const day = new Date(now.getTime() + dayOffset * MS_PER_DAY);
    const weekday = day.getDay(); // 0 = Sunday ... 6 = Saturday
    if (weekday === 5 || weekday === 6) continue; // Friday/Saturday closed

    const perDay = Math.min(2, count - starts.length);
    for (let slot = 0; slot < perDay; slot += 1) {
      const start = new Date(day);
      start.setHours(hours[(starts.length + slot) % hours.length], 0, 0, 0);
      if (start.getTime() <= Date.now()) continue;
      starts.push(start);
    }
  }

  return starts;
}

/**
 * Ratings are weighted per doctor rather than globally, so different
 * doctors genuinely settle at different averages (roughly 4.2-4.9) instead
 * of every profile showing an identical score.
 */
function ratingFor(demo: DemoDoctor): number {
  const bias = demo.licenseNumber.charCodeAt(demo.licenseNumber.length - 1) % 3;
  const chanceOfFive = 0.45 + bias * 0.18;
  const roll = nextRandom();
  if (roll < chanceOfFive) return 5;
  if (roll < chanceOfFive + 0.35) return 4;
  return 3;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
