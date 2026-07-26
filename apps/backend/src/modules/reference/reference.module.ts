import { Module } from '@nestjs/common';

import { AuthenticationGuardsModule } from '../authentication/authentication-guards.module.js';

import { COUNTRY_REPOSITORY, INSURANCE_PROVIDER_REPOSITORY, MEDICAL_SPECIALTY_REPOSITORY } from './application/ports/tokens.js';
import { CreateCountryUseCase } from './application/use-cases/create-country/create-country.use-case.js';
import { CreateInsuranceProviderUseCase } from './application/use-cases/create-insurance-provider/create-insurance-provider.use-case.js';
import { CreateMedicalSpecialtyUseCase } from './application/use-cases/create-medical-specialty/create-medical-specialty.use-case.js';
import { ListCountriesUseCase } from './application/use-cases/list-countries/list-countries.use-case.js';
import { ListInsuranceProvidersUseCase } from './application/use-cases/list-insurance-providers/list-insurance-providers.use-case.js';
import { ListMedicalSpecialtiesUseCase } from './application/use-cases/list-medical-specialties/list-medical-specialties.use-case.js';
import { UpdateCountryUseCase } from './application/use-cases/update-country/update-country.use-case.js';
import { UpdateInsuranceProviderUseCase } from './application/use-cases/update-insurance-provider/update-insurance-provider.use-case.js';
import { UpdateMedicalSpecialtyUseCase } from './application/use-cases/update-medical-specialty/update-medical-specialty.use-case.js';
import type { CountryRepository } from './domain/repositories/country.repository.js';
import type { InsuranceProviderRepository } from './domain/repositories/insurance-provider.repository.js';
import type { MedicalSpecialtyRepository } from './domain/repositories/medical-specialty.repository.js';
import { PrismaCountryRepository } from './infrastructure/prisma/prisma-country.repository.js';
import { PrismaInsuranceProviderRepository } from './infrastructure/prisma/prisma-insurance-provider.repository.js';
import { PrismaMedicalSpecialtyRepository } from './infrastructure/prisma/prisma-medical-specialty.repository.js';
import { AdminReferenceController } from './presentation/controllers/admin-reference.controller.js';
import { ReferenceDirectoryController } from './presentation/controllers/reference-directory.controller.js';

// Onboarding Redesign (2026-07-21 proposal, §3/§14 Stage O.1): a thin,
// cross-cutting module owning genuinely runtime-extensible lookup data
// (medical specialties, countries/nationalities, insurance providers) --
// finishes the `reference` schema docs/09-physical-database.md already
// designed but never built. Referenced by Doctor (specialty) and Patient
// (insurance provider, nationality) alike, but owned by neither -- same
// "own aggregate roots, no owning bounded context" shape AdministrationModule
// already established for Hospital/Department.
@Module({
  imports: [AuthenticationGuardsModule],
  controllers: [ReferenceDirectoryController, AdminReferenceController],
  providers: [
    { provide: MEDICAL_SPECIALTY_REPOSITORY, useClass: PrismaMedicalSpecialtyRepository },
    { provide: COUNTRY_REPOSITORY, useClass: PrismaCountryRepository },
    { provide: INSURANCE_PROVIDER_REPOSITORY, useClass: PrismaInsuranceProviderRepository },
    {
      provide: ListMedicalSpecialtiesUseCase,
      useFactory: (repo: MedicalSpecialtyRepository) => new ListMedicalSpecialtiesUseCase(repo),
      inject: [MEDICAL_SPECIALTY_REPOSITORY],
    },
    {
      provide: CreateMedicalSpecialtyUseCase,
      useFactory: (repo: MedicalSpecialtyRepository) => new CreateMedicalSpecialtyUseCase(repo),
      inject: [MEDICAL_SPECIALTY_REPOSITORY],
    },
    {
      provide: UpdateMedicalSpecialtyUseCase,
      useFactory: (repo: MedicalSpecialtyRepository) => new UpdateMedicalSpecialtyUseCase(repo),
      inject: [MEDICAL_SPECIALTY_REPOSITORY],
    },
    {
      provide: ListCountriesUseCase,
      useFactory: (repo: CountryRepository) => new ListCountriesUseCase(repo),
      inject: [COUNTRY_REPOSITORY],
    },
    {
      provide: CreateCountryUseCase,
      useFactory: (repo: CountryRepository) => new CreateCountryUseCase(repo),
      inject: [COUNTRY_REPOSITORY],
    },
    {
      provide: UpdateCountryUseCase,
      useFactory: (repo: CountryRepository) => new UpdateCountryUseCase(repo),
      inject: [COUNTRY_REPOSITORY],
    },
    {
      provide: ListInsuranceProvidersUseCase,
      useFactory: (repo: InsuranceProviderRepository) => new ListInsuranceProvidersUseCase(repo),
      inject: [INSURANCE_PROVIDER_REPOSITORY],
    },
    {
      provide: CreateInsuranceProviderUseCase,
      useFactory: (repo: InsuranceProviderRepository) => new CreateInsuranceProviderUseCase(repo),
      inject: [INSURANCE_PROVIDER_REPOSITORY],
    },
    {
      provide: UpdateInsuranceProviderUseCase,
      useFactory: (repo: InsuranceProviderRepository) => new UpdateInsuranceProviderUseCase(repo),
      inject: [INSURANCE_PROVIDER_REPOSITORY],
    },
  ],
  exports: [ListMedicalSpecialtiesUseCase, ListCountriesUseCase, ListInsuranceProvidersUseCase],
})
export class ReferenceModule {}
