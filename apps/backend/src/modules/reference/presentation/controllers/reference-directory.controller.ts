import { Controller, Get, UseGuards } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { ListCountriesUseCase } from '../../application/use-cases/list-countries/list-countries.use-case.js';
import { ListInsuranceProvidersUseCase } from '../../application/use-cases/list-insurance-providers/list-insurance-providers.use-case.js';
import { ListMedicalSpecialtiesUseCase } from '../../application/use-cases/list-medical-specialties/list-medical-specialties.use-case.js';
import { CountryResponseDto } from '../dto/country-response.dto.js';
import { InsuranceProviderResponseDto } from '../dto/insurance-provider-response.dto.js';
import { MedicalSpecialtyResponseDto } from '../dto/medical-specialty-response.dto.js';

// Onboarding Redesign (2026-07-21 proposal, §5/§14 Stage O.1): a read-only
// reference-data directory any authenticated account can browse to populate
// onboarding dropdowns (specialty, nationality, insurance provider) --
// deliberately not the SuperAdmin-only `/admin/reference/*` surface.
// Mirrors HospitalDirectoryController's own "second, more permissive route
// onto the same use cases" precedent exactly.
@Controller('reference')
@UseGuards(JwtAuthGuard)
export class ReferenceDirectoryController {
  constructor(
    private readonly listMedicalSpecialtiesUseCase: ListMedicalSpecialtiesUseCase,
    private readonly listCountriesUseCase: ListCountriesUseCase,
    private readonly listInsuranceProvidersUseCase: ListInsuranceProvidersUseCase,
  ) {}

  @Get('specialties')
  async listSpecialties(): Promise<ResponseEnvelope<MedicalSpecialtyResponseDto[]>> {
    const specialties = await this.listMedicalSpecialtiesUseCase.execute();
    return envelope(specialties.map((specialty) => MedicalSpecialtyResponseDto.fromDomain(specialty)));
  }

  @Get('countries')
  async listCountries(): Promise<ResponseEnvelope<CountryResponseDto[]>> {
    const countries = await this.listCountriesUseCase.execute();
    return envelope(countries.map((country) => CountryResponseDto.fromDomain(country)));
  }

  @Get('insurance-providers')
  async listInsuranceProviders(): Promise<ResponseEnvelope<InsuranceProviderResponseDto[]>> {
    const providers = await this.listInsuranceProvidersUseCase.execute();
    return envelope(providers.map((provider) => InsuranceProviderResponseDto.fromDomain(provider)));
  }
}
