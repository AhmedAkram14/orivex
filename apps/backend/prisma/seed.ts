/**
 * Demo Data & Profile Avatar Pass -- the Prisma seed script.
 *
 * Two stages:
 *
 * 1. IDENTITIES (sections 1-4) -- reference data, admin/doctor/patient
 *    accounts, profiles, weekly working hours and verification cases, driven
 *    entirely by the REAL application-layer use cases resolved out of a real
 *    Nest DI container, so NotificationModule's event handlers observe the
 *    same domain events a real request would raise. That is exactly why this
 *    boots `NestFactory.createApplicationContext(...)` instead of
 *    hand-constructing use cases with `new`.
 *
 * 2. DEMO TIMELINE (section 5, prisma/demo/) -- nine months of history plus
 *    today's queue and the next 30 days, anchored to "now" (or
 *    DEMO_ANCHOR_DATE). Historical rows cannot go through the write-path
 *    commands (they self-timestamp `new Date()` and AvailabilityWindow.define()
 *    rejects past starts -- correct production rules this script never
 *    weakens), so the timeline writes them with deterministic ids and
 *    historical timestamps, deriving everything it can from real code: the
 *    HMAC prescription signer, the slot-grid generator, the notification
 *    handlers' own wording. See prisma/demo/README.md.
 *
 * Idempotent: accounts are skipped when an Account with that email already
 * exists, reference data is found-or-created by name, and the timeline
 * updates its own rows in place. Running it twice creates no duplicate rows.
 *
 * Run with: `npm run seed` (from apps/backend), or `npx prisma db seed`.
 */
import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from '../src/app.module.js';
import { MEDIA_ASSET_REPOSITORY } from '../src/modules/asset/application/ports/tokens.js';
import { MediaAsset } from '../src/modules/asset/domain/entities/media-asset.entity.js';
import { MediaAssetPurpose } from '../src/modules/asset/domain/enums/media-asset-purpose.enum.js';
import type { MediaAssetRepository } from '../src/modules/asset/domain/repositories/media-asset.repository.js';
import { CreateDepartmentCommand } from '../src/modules/administration/application/use-cases/create-department/create-department.command.js';
import { CreateDepartmentUseCase } from '../src/modules/administration/application/use-cases/create-department/create-department.use-case.js';
import { CreateHospitalCommand } from '../src/modules/administration/application/use-cases/create-hospital/create-hospital.command.js';
import { CreateHospitalUseCase } from '../src/modules/administration/application/use-cases/create-hospital/create-hospital.use-case.js';
import { ListDepartmentsQuery } from '../src/modules/administration/application/use-cases/list-departments/list-departments.query.js';
import { ListDepartmentsUseCase } from '../src/modules/administration/application/use-cases/list-departments/list-departments.use-case.js';
import { ListHospitalsUseCase } from '../src/modules/administration/application/use-cases/list-hospitals/list-hospitals.use-case.js';
import { CREDENTIAL_REPOSITORY } from '../src/modules/authentication/application/ports/tokens.js';
import { RegisterCommand } from '../src/modules/authentication/application/use-cases/register/register.command.js';
import { RegisterUseCase } from '../src/modules/authentication/application/use-cases/register/register.use-case.js';
import type { CredentialRepository } from '../src/modules/authentication/domain/repositories/credential.repository.js';
import { RegisterDoctorProfileCommand } from '../src/modules/doctor/application/use-cases/register-doctor-profile/register-doctor-profile.command.js';
import { RegisterDoctorProfileUseCase } from '../src/modules/doctor/application/use-cases/register-doctor-profile/register-doctor-profile.use-case.js';
import { ProfessionalRank } from '../src/modules/doctor/domain/enums/professional-rank.enum.js';
import { ACCOUNT_REPOSITORY } from '../src/modules/identity/application/ports/tokens.js';
import { GetAccountByEmailUseCase } from '../src/modules/identity/application/use-cases/get-account-by-email/get-account-by-email.use-case.js';
import { UpdateAccountRoleCommand } from '../src/modules/identity/application/use-cases/update-account-role/update-account-role.command.js';
import { UpdateAccountRoleUseCase } from '../src/modules/identity/application/use-cases/update-account-role/update-account-role.use-case.js';
import { UpdatePersonalProfileCommand } from '../src/modules/identity/application/use-cases/update-personal-profile/update-personal-profile.command.js';
import { UpdatePersonalProfileUseCase } from '../src/modules/identity/application/use-cases/update-personal-profile/update-personal-profile.use-case.js';
import { AccountRole } from '../src/modules/identity/domain/enums/account-role.enum.js';
import type { AccountRepository } from '../src/modules/identity/domain/repositories/account.repository.js';
import { AccountId } from '../src/modules/identity/domain/value-objects/account-id.value-object.js';
import { Gender } from '../src/modules/identity/domain/enums/gender.enum.js';
import { CreatePatientProfileCommand } from '../src/modules/patient/application/use-cases/create-patient-profile/create-patient-profile.command.js';
import { CreatePatientProfileUseCase } from '../src/modules/patient/application/use-cases/create-patient-profile/create-patient-profile.use-case.js';
import { UpdatePatientProfileCommand } from '../src/modules/patient/application/use-cases/update-patient-profile/update-patient-profile.command.js';
import { UpdatePatientProfileUseCase } from '../src/modules/patient/application/use-cases/update-patient-profile/update-patient-profile.use-case.js';
import { BloodType } from '../src/modules/patient/domain/enums/blood-type.enum.js';
import { EmergencyRelationship } from '../src/modules/patient/domain/enums/emergency-relationship.enum.js';
import { CreateCountryCommand } from '../src/modules/reference/application/use-cases/create-country/create-country.command.js';
import { CreateCountryUseCase } from '../src/modules/reference/application/use-cases/create-country/create-country.use-case.js';
import { CreateInsuranceProviderCommand } from '../src/modules/reference/application/use-cases/create-insurance-provider/create-insurance-provider.command.js';
import { CreateInsuranceProviderUseCase } from '../src/modules/reference/application/use-cases/create-insurance-provider/create-insurance-provider.use-case.js';
import { CreateMedicalSpecialtyCommand } from '../src/modules/reference/application/use-cases/create-medical-specialty/create-medical-specialty.command.js';
import { CreateMedicalSpecialtyUseCase } from '../src/modules/reference/application/use-cases/create-medical-specialty/create-medical-specialty.use-case.js';
import { UpdateMedicalSpecialtyCommand } from '../src/modules/reference/application/use-cases/update-medical-specialty/update-medical-specialty.command.js';
import { UpdateMedicalSpecialtyUseCase } from '../src/modules/reference/application/use-cases/update-medical-specialty/update-medical-specialty.use-case.js';
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
  DEMO_HOSPITAL_ADMIN,
  DEMO_HOSPITALS,
  DEMO_INSURANCE_PROVIDERS,
  DEMO_PASSWORD,
  DEMO_PATIENTS,
  DEMO_SUPER_ADMIN,
} from './demo-data/demo-people.js';
import type { DemoDoctor, DemoGender, DemoPatient } from './demo-data/demo-people.js';
import { SPECIALTY_NAMES_AR } from './demo-data/specialty-names-ar.js';
import { HOSPITAL_ADDRESSES } from './demo/catalog/content.js';
import { isDemoTimelineAllowed, runDemoTimeline } from './demo/run.js';

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

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------
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
    // Account.updateProfile() (phoneNumber/displayName) has no public
    // application-layer use case yet -- same "no use case exists for this"
    // exception ensureAccount's credentialRepository.save() below already
    // relies on, not a new pattern.
    const accountRepository = app.get<AccountRepository>(ACCOUNT_REPOSITORY);

    const listMedicalSpecialties = app.get(ListMedicalSpecialtiesUseCase);
    const createMedicalSpecialty = app.get(CreateMedicalSpecialtyUseCase);
    const updateMedicalSpecialty = app.get(UpdateMedicalSpecialtyUseCase);
    const listInsuranceProviders = app.get(ListInsuranceProvidersUseCase);
    const createInsuranceProvider = app.get(CreateInsuranceProviderUseCase);
    const listCountries = app.get(ListCountriesUseCase);
    const createCountry = app.get(CreateCountryUseCase);
    const listHospitals = app.get(ListHospitalsUseCase);
    const createHospital = app.get(CreateHospitalUseCase);

    const registerDoctorProfile = app.get(RegisterDoctorProfileUseCase);
    const updateDoctorWorkingHours = app.get(UpdateDoctorWorkingHoursUseCase);

    const createPatientProfile = app.get(CreatePatientProfileUseCase);
    const updatePatientProfile = app.get(UpdatePatientProfileUseCase);

    const submitDoctorVerification = app.get(SubmitDoctorVerificationUseCase);
    const submitPatientVerification = app.get(SubmitPatientVerificationUseCase);
    const decideVerification = app.get(DecideVerificationUseCase);
    const suspendVerificationCase = app.get(SuspendVerificationCaseUseCase);

    // -----------------------------------------------------------------
    // 1. Reference data (idempotent, found-or-created by name)
    // -----------------------------------------------------------------
    const specialtyIdsByName = new Map<string, string>();
    for (const specialty of await listMedicalSpecialties.execute()) {
      specialtyIdsByName.set(specialty.getName(), specialty.getId());
      // An existing specialty with no Arabic name gets one (never overwriting an admin's own translation).
      const nameAr = SPECIALTY_NAMES_AR[specialty.getName()];
      if (nameAr && !specialty.getNameAr()) {
        await updateMedicalSpecialty.execute(new UpdateMedicalSpecialtyCommand({ medicalSpecialtyId: specialty.getId(), nameAr }));
        console.info(`  ~ specialty "${specialty.getName()}" nameAr`);
      }
    }
    for (const name of new Set(DEMO_DOCTORS.map((doctor) => doctor.specialtyName))) {
      if (specialtyIdsByName.has(name)) continue;
      const created = await createMedicalSpecialty.execute(new CreateMedicalSpecialtyCommand({ name, nameAr: SPECIALTY_NAMES_AR[name] }));
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
      const created = await createHospital.execute(new CreateHospitalCommand({ name, address: HOSPITAL_ADDRESSES[name] ?? 'Cairo, Egypt' }));
      hospitalIdsByName.set(created.getName(), created.getId());
      console.info(`  + hospital "${name}"`);
    }

    // One department per specialty actually practiced at that hospital
    // (derived from DEMO_DOCTORS itself, never a hand-maintained duplicate
    // list) -- real Department rows via AdministrationModule's own use
    // cases, never `prisma.department.create()` directly.
    const listDepartments = app.get(ListDepartmentsUseCase);
    const createDepartment = app.get(CreateDepartmentUseCase);
    const departmentIdsByHospitalAndName = new Map<string, string>();
    const specialtiesByHospital = new Map<string, Set<string>>();
    for (const doctor of DEMO_DOCTORS) {
      if (!doctor.hospitalName) continue;
      const set = specialtiesByHospital.get(doctor.hospitalName) ?? new Set<string>();
      set.add(doctor.specialtyName);
      specialtiesByHospital.set(doctor.hospitalName, set);
    }
    for (const [hospitalName, specialties] of specialtiesByHospital) {
      const hospitalId = hospitalIdsByName.get(hospitalName);
      if (!hospitalId) continue;
      for (const department of await listDepartments.execute(new ListDepartmentsQuery({ hospitalId }))) {
        departmentIdsByHospitalAndName.set(`${hospitalName}::${department.getName()}`, department.getId());
      }
      for (const specialtyName of specialties) {
        const departmentName = `${specialtyName} Department`;
        const key = `${hospitalName}::${departmentName}`;
        if (departmentIdsByHospitalAndName.has(key)) continue;
        const created = await createDepartment.execute(new CreateDepartmentCommand({ hospitalId, name: departmentName }));
        departmentIdsByHospitalAndName.set(key, created.getId());
        console.info(`  + department "${departmentName}" at "${hospitalName}"`);
      }
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

    /**
     * Account.updateProfile()'s phoneNumber has no public use case yet (only
     * UpdatePersonalProfileUseCase's separate, narrower field set does) --
     * this is that same real domain method + repository save, called
     * unconditionally (not gated by ensureAccount's `created` flag) so a
     * re-run also self-heals a phone number missing from an earlier run.
     */
    async function setPhoneNumber(accountId: string, phoneNumber: string): Promise<void> {
      const account = await accountRepository.findById(AccountId.create(accountId));
      if (!account) return;
      account.updateProfile({ phoneNumber });
      await accountRepository.save(account);
    }

    // -----------------------------------------------------------------
    // 2. Admin accounts
    // -----------------------------------------------------------------
    console.info('Seeding admin accounts...');
    const superAdmin = await ensureAccount(DEMO_SUPER_ADMIN.email, DEMO_SUPER_ADMIN.displayName, AccountRole.SuperAdmin);
    await setPhoneNumber(superAdmin.accountId, DEMO_SUPER_ADMIN.phoneNumber);
    const hospitalAdmin = await ensureAccount(DEMO_HOSPITAL_ADMIN.email, DEMO_HOSPITAL_ADMIN.displayName, AccountRole.HospitalAdmin);
    await setPhoneNumber(hospitalAdmin.accountId, DEMO_HOSPITAL_ADMIN.phoneNumber);

    // -----------------------------------------------------------------
    // 3. Doctors
    // -----------------------------------------------------------------
    console.info('Seeding doctors...');
    for (const [doctorIndex, demo] of DEMO_DOCTORS.entries()) {
      try {
        // Every demo doctor account is registered as Patient, exactly like a
        // real applicant -- Doctor role is never set directly. It is granted
        // automatically, exclusively by PromoteDoctorRoleOnVerificationHandler
        // reacting to a real DoctorVerifiedEvent below, the one and only real
        // path from Patient to Doctor in this domain (see that handler's own
        // header comment). A 'pending' demo doctor therefore correctly stays
        // Patient-role, same as a real unapproved applicant would.
        const { accountId, created } = await ensureAccount(demo.email, demo.displayName, AccountRole.Patient);
        await setPhoneNumber(accountId, demo.phoneNumber);
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
            departmentId: demo.hospitalName
              ? departmentIdsByHospitalAndName.get(`${demo.hospitalName}::${demo.specialtyName} Department`)
              : undefined,
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
        let isApproved = false;
        if (demo.verification === 'approved') {
          await decideVerification.execute(
            new DecideVerificationCommand({
              verificationCaseId: verificationCase.getId(),
              status: VerificationStatus.Approved,
              reason: 'Credentials verified against the Egyptian Medical Syndicate register.',
            }),
          );
          isApproved = true;
        } else if (demo.verification === 'rejected') {
          await decideVerification.execute(
            new DecideVerificationCommand({
              verificationCaseId: verificationCase.getId(),
              status: VerificationStatus.Rejected,
              reason: 'The uploaded medical licence has expired. Please resubmit with a current licence.',
            }),
          );

          // Scenario G: rejection is never the end of the real applicant-
          // facing lifecycle -- SubmitDoctorVerificationUseCase has no
          // separate "resubmit" endpoint at all (confirmed ground truth, see
          // verification-resubmission-lifecycle.integration.test.ts): calling
          // it again with fresh documents unconditionally opens a brand-new
          // VerificationCase, leaving the rejected one in history untouched.
          // Approving *this* second case is what finally, for real, promotes
          // the account to Doctor via the same DoctorVerifiedEvent path.
          const resubmittedDocumentId = await createDemoDocument(accountId, MediaAssetPurpose.MedicalLicense);
          const resubmittedCase = await submitDoctorVerification.execute(
            new SubmitDoctorVerificationCommand({
              doctorId: profile.getId(),
              subjectAccountId: accountId,
              licenseNumber: demo.licenseNumber,
              specialtyCode: demo.specialtyName,
              documentAssetIds: [resubmittedDocumentId],
            }),
          );
          await decideVerification.execute(
            new DecideVerificationCommand({
              verificationCaseId: resubmittedCase.getId(),
              status: VerificationStatus.Approved,
              reason: 'Updated licence documentation confirmed against the Egyptian Medical Syndicate register.',
            }),
          );
          isApproved = true;
        }

        // Only an approved doctor has a real practice: working hours and
        // bookable slots would be meaningless for a still-pending applicant.
        // Still logged as seeded either way -- a 'pending' outcome is a real,
        // intentional result, not a failure to report as one.
        if (!isApproved) {
          console.info(`  + doctor ${demo.email} (${demo.verification})`);
          continue;
        }

        const workingHoursTemplate = WORKING_HOURS_TEMPLATES[doctorIndex % WORKING_HOURS_TEMPLATES.length];
        await updateDoctorWorkingHours.execute(
          new UpdateDoctorWorkingHoursCommand({
            doctorId: profile.getId(),
            days: buildWorkingHours(demo.consultationFeeAmount, workingHoursTemplate),
          }),
        );

        // No hand-made availability windows: bookable slots are materialised
        // from these weekly hours by the product's own lazy path
        // (GetBookableAvailabilityUseCase), on its 30 + 5 minute grid. The
        // windows this used to create on the hour (e.g. 11:00) fell between
        // grid slots.

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
        await setPhoneNumber(accountId, demo.phoneNumber);
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
    // 5. Demo timeline (prisma/demo/): nine months of specialty-coherent
    // history, today's queue and upcoming bookings, clinical records,
    // payments, reviews, messages, notifications, knowledge articles,
    // disputes and waitlist -- anchored to "now" (or DEMO_ANCHOR_DATE),
    // idempotent, and scoped to the demo allow-list. See
    // prisma/demo/README.md. Skipped on a non-local database unless the
    // owner explicitly approved it (DEMO_REMOTE_APPROVED=yes).
    // -----------------------------------------------------------------
    if (isDemoTimelineAllowed()) {
      console.info('Seeding the demo timeline...');
      await runDemoTimeline(app, { dryRun: false, checkOnly: false, allowRemote: false, skipStorage: false, anchor: process.env.DEMO_ANCHOR_DATE });
    } else {
      console.warn('Demo timeline skipped: DATABASE_URL is not local and DEMO_REMOTE_APPROVED is not set (see prisma/demo/README.md).');
    }

    console.info('Seed complete.');
  } finally {
    await app.close();
  }
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------
interface WorkingHoursTemplate {
  workingDays: WeekDay[];
  hours: { start: string; end: string };
  breaks: { start: string; end: string }[];
}

/**
 * Four genuinely different real-world schedules (docs section 7: "Do not
 * give everyone identical schedules") -- assigned round-robin by each
 * doctor's position in DEMO_DOCTORS, so both the "Working Hours" a doctor's
 * own profile shows AND the concrete AvailabilityWindow slots patients can
 * actually book (buildWindowStartTimes below) come from the same template,
 * never a cosmetic mismatch between the two.
 */
const WORKING_HOURS_TEMPLATES: WorkingHoursTemplate[] = [
  // Sunday-Thursday mornings, no break.
  { workingDays: [WeekDay.Sunday, WeekDay.Monday, WeekDay.Tuesday, WeekDay.Wednesday, WeekDay.Thursday], hours: { start: '09:00', end: '15:00' }, breaks: [] },
  // Saturday-Wednesday evenings.
  { workingDays: [WeekDay.Saturday, WeekDay.Sunday, WeekDay.Monday, WeekDay.Tuesday, WeekDay.Wednesday], hours: { start: '16:00', end: '22:00' }, breaks: [] },
  // Monday-Thursday only, with a midday break.
  { workingDays: [WeekDay.Monday, WeekDay.Tuesday, WeekDay.Wednesday, WeekDay.Thursday], hours: { start: '10:00', end: '18:00' }, breaks: [{ start: '13:00', end: '14:00' }] },
  // Standard Egyptian working week, with a midday break.
  { workingDays: [WeekDay.Sunday, WeekDay.Monday, WeekDay.Tuesday, WeekDay.Wednesday, WeekDay.Thursday], hours: { start: '09:00', end: '17:00' }, breaks: [{ start: '13:00', end: '14:00' }] },
];

function buildWorkingHours(consultationFeeAmount: number | undefined, template: WorkingHoursTemplate): WorkingHoursDayInput[] {
  const pricing = consultationFeeAmount
    ? SchedulingConsultationPricing.paid(SchedulingMoney.create(consultationFeeAmount, 'EGP'))
    : SchedulingConsultationPricing.free();

  return ALL_WEEK_DAYS.map((dayOfWeek) => {
    const isWorkingDay = template.workingDays.includes(dayOfWeek);
    return {
      dayOfWeek,
      isWorkingDay,
      hours: template.hours,
      breaks: isWorkingDay ? template.breaks : [],
      pricing,
    };
  });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    // A one-off script, not the long-running server: by this point
    // app.close() has already run every real shutdown hook (DB writes are
    // long done). BullMQ/ioredis's own reconnect timers are known to
    // outlive a resolved close() (confirmed by tracing: both
    // BullMqNotificationQueueAdapter's and AppointmentReminderWorkerService's
    // onModuleDestroy fire and resolve, yet the Redis sockets stay open) --
    // waiting for Node's event loop to drain on its own would hang this
    // script forever, which matters here because Render's `jobs create`
    // needs the process to actually exit to know the job finished.
    process.exit(process.exitCode ?? 0);
  });
