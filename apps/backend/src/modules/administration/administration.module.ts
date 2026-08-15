import { Module } from '@nestjs/common';

import { AuthenticationGuardsModule } from '../authentication/authentication-guards.module.js';
import { DoctorModule } from '../doctor/doctor.module.js';
import { GetDoctorProfileByIdUseCase } from '../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { IdentityModule } from '../identity/identity.module.js';
import { GetAccountByIdUseCase } from '../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { ListAccountsUseCase } from '../identity/application/use-cases/list-accounts/list-accounts.use-case.js';
import { GetPatientProfileByIdUseCase } from '../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { PatientModule } from '../patient/patient.module.js';
import { ListPaymentTransactionsUseCase } from '../payment/application/use-cases/list-payment-transactions/list-payment-transactions.use-case.js';
import { PaymentModule } from '../payment/payment.module.js';
import { DecideVerificationUseCase } from '../trust/application/use-cases/decide-verification/decide-verification.use-case.js';
import { GetVerificationCaseByIdUseCase } from '../trust/application/use-cases/get-verification-case-by-id/get-verification-case-by-id.use-case.js';
import { ListPendingVerificationCasesUseCase } from '../trust/application/use-cases/list-pending-verification-cases/list-pending-verification-cases.use-case.js';
import { ListVerificationCasesForSubjectUseCase } from '../trust/application/use-cases/list-verification-cases-for-subject/list-verification-cases-for-subject.use-case.js';
import { TrustModule } from '../trust/trust.module.js';

import { DEPARTMENT_REPOSITORY, HOSPITAL_REPOSITORY } from './application/ports/tokens.js';
import { CreateDepartmentUseCase } from './application/use-cases/create-department/create-department.use-case.js';
import { CreateHospitalUseCase } from './application/use-cases/create-hospital/create-hospital.use-case.js';
import { GetPlatformKpisUseCase } from './application/use-cases/get-platform-kpis/get-platform-kpis.use-case.js';
import { GetVerificationHistoryUseCase } from './application/use-cases/get-verification-history/get-verification-history.use-case.js';
import { GetVerificationReviewQueueUseCase } from './application/use-cases/get-verification-review-queue/get-verification-review-queue.use-case.js';
import { ListDepartmentsUseCase } from './application/use-cases/list-departments/list-departments.use-case.js';
import { ListHospitalsUseCase } from './application/use-cases/list-hospitals/list-hospitals.use-case.js';
import { ListPaymentTransactionsForAdminUseCase } from './application/use-cases/list-payment-transactions-for-admin/list-payment-transactions-for-admin.use-case.js';
import { ReviewVerificationCaseUseCase } from './application/use-cases/review-verification-case/review-verification-case.use-case.js';
import type { DepartmentRepository } from './domain/repositories/department.repository.js';
import type { HospitalRepository } from './domain/repositories/hospital.repository.js';
import { PrismaDepartmentRepository } from './infrastructure/prisma/prisma-department.repository.js';
import { PrismaHospitalRepository } from './infrastructure/prisma/prisma-hospital.repository.js';
import { AdministrationController } from './presentation/controllers/administration.controller.js';
import { HospitalDirectoryController } from './presentation/controllers/hospital-directory.controller.js';

// ORIVEX Roadmap 2.0 Stage 4: grows from "internal orchestration only, no
// owned domain entities" (its pre-Stage-4 state) into a real module with its
// own aggregate roots (Hospital/Department) and its first controller. Still
// depends one-way on IdentityModule/TrustModule, calling only their
// exported use cases -- never their repositories directly, same rule as
// before Stage 4.
@Module({
  imports: [IdentityModule, TrustModule, AuthenticationGuardsModule, PaymentModule, PatientModule, DoctorModule],
  controllers: [AdministrationController, HospitalDirectoryController],
  providers: [
    { provide: HOSPITAL_REPOSITORY, useClass: PrismaHospitalRepository },
    { provide: DEPARTMENT_REPOSITORY, useClass: PrismaDepartmentRepository },
    {
      provide: ListHospitalsUseCase,
      useFactory: (hospitalRepository: HospitalRepository) => new ListHospitalsUseCase(hospitalRepository),
      inject: [HOSPITAL_REPOSITORY],
    },
    {
      provide: CreateHospitalUseCase,
      useFactory: (hospitalRepository: HospitalRepository) => new CreateHospitalUseCase(hospitalRepository),
      inject: [HOSPITAL_REPOSITORY],
    },
    {
      provide: ListDepartmentsUseCase,
      useFactory: (hospitalRepository: HospitalRepository, departmentRepository: DepartmentRepository) =>
        new ListDepartmentsUseCase(hospitalRepository, departmentRepository),
      inject: [HOSPITAL_REPOSITORY, DEPARTMENT_REPOSITORY],
    },
    {
      provide: CreateDepartmentUseCase,
      useFactory: (hospitalRepository: HospitalRepository, departmentRepository: DepartmentRepository) =>
        new CreateDepartmentUseCase(hospitalRepository, departmentRepository),
      inject: [HOSPITAL_REPOSITORY, DEPARTMENT_REPOSITORY],
    },
    {
      provide: GetPlatformKpisUseCase,
      useFactory: (listAccountsUseCase: ListAccountsUseCase, hospitalRepository: HospitalRepository) =>
        new GetPlatformKpisUseCase(listAccountsUseCase, hospitalRepository),
      inject: [ListAccountsUseCase, HOSPITAL_REPOSITORY],
    },
    {
      provide: GetVerificationReviewQueueUseCase,
      useFactory: (listPendingVerificationCasesUseCase: ListPendingVerificationCasesUseCase) =>
        new GetVerificationReviewQueueUseCase(listPendingVerificationCasesUseCase),
      inject: [ListPendingVerificationCasesUseCase],
    },
    {
      provide: ReviewVerificationCaseUseCase,
      useFactory: (decideVerificationUseCase: DecideVerificationUseCase) =>
        new ReviewVerificationCaseUseCase(decideVerificationUseCase),
      inject: [DecideVerificationUseCase],
    },
    {
      provide: GetVerificationHistoryUseCase,
      useFactory: (
        getVerificationCaseByIdUseCase: GetVerificationCaseByIdUseCase,
        listVerificationCasesForSubjectUseCase: ListVerificationCasesForSubjectUseCase,
      ) => new GetVerificationHistoryUseCase(getVerificationCaseByIdUseCase, listVerificationCasesForSubjectUseCase),
      inject: [GetVerificationCaseByIdUseCase, ListVerificationCasesForSubjectUseCase],
    },
    {
      // ORIVEX Roadmap Phase 3, Critical Lifecycle Gaps, Step 4: composes
      // PaymentModule's exported ListPaymentTransactionsUseCase with
      // Patient/Doctor/IdentityModule's exported profile/account reads --
      // see the use case's own comment for why this orchestration lives
      // here rather than in PaymentModule.
      provide: ListPaymentTransactionsForAdminUseCase,
      useFactory: (
        listPaymentTransactionsUseCase: ListPaymentTransactionsUseCase,
        getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
        getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
        getAccountByIdUseCase: GetAccountByIdUseCase,
      ) =>
        new ListPaymentTransactionsForAdminUseCase(
          listPaymentTransactionsUseCase,
          getPatientProfileByIdUseCase,
          getDoctorProfileByIdUseCase,
          getAccountByIdUseCase,
        ),
      inject: [ListPaymentTransactionsUseCase, GetPatientProfileByIdUseCase, GetDoctorProfileByIdUseCase, GetAccountByIdUseCase],
    },
  ],
  exports: [
    GetVerificationReviewQueueUseCase,
    ReviewVerificationCaseUseCase,
    GetVerificationHistoryUseCase,
    ListHospitalsUseCase,
    CreateHospitalUseCase,
    ListDepartmentsUseCase,
    CreateDepartmentUseCase,
    GetPlatformKpisUseCase,
  ],
})
export class AdministrationModule {}
