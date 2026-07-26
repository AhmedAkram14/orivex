import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { CreateCountryCommand } from '../../application/use-cases/create-country/create-country.command.js';
import { CreateCountryUseCase } from '../../application/use-cases/create-country/create-country.use-case.js';
import { CreateInsuranceProviderCommand } from '../../application/use-cases/create-insurance-provider/create-insurance-provider.command.js';
import { CreateInsuranceProviderUseCase } from '../../application/use-cases/create-insurance-provider/create-insurance-provider.use-case.js';
import { CreateMedicalSpecialtyCommand } from '../../application/use-cases/create-medical-specialty/create-medical-specialty.command.js';
import { CreateMedicalSpecialtyUseCase } from '../../application/use-cases/create-medical-specialty/create-medical-specialty.use-case.js';
import { ListCountriesUseCase } from '../../application/use-cases/list-countries/list-countries.use-case.js';
import { ListInsuranceProvidersUseCase } from '../../application/use-cases/list-insurance-providers/list-insurance-providers.use-case.js';
import { ListMedicalSpecialtiesUseCase } from '../../application/use-cases/list-medical-specialties/list-medical-specialties.use-case.js';
import { UpdateCountryCommand } from '../../application/use-cases/update-country/update-country.command.js';
import { UpdateCountryUseCase } from '../../application/use-cases/update-country/update-country.use-case.js';
import { UpdateInsuranceProviderCommand } from '../../application/use-cases/update-insurance-provider/update-insurance-provider.command.js';
import { UpdateInsuranceProviderUseCase } from '../../application/use-cases/update-insurance-provider/update-insurance-provider.use-case.js';
import { UpdateMedicalSpecialtyCommand } from '../../application/use-cases/update-medical-specialty/update-medical-specialty.command.js';
import { UpdateMedicalSpecialtyUseCase } from '../../application/use-cases/update-medical-specialty/update-medical-specialty.use-case.js';
import { CountryResponseDto } from '../dto/country-response.dto.js';
import { CreateCountryRequestDto } from '../dto/create-country-request.dto.js';
import { CreateInsuranceProviderRequestDto } from '../dto/create-insurance-provider-request.dto.js';
import { CreateMedicalSpecialtyRequestDto } from '../dto/create-medical-specialty-request.dto.js';
import { InsuranceProviderResponseDto } from '../dto/insurance-provider-response.dto.js';
import { MedicalSpecialtyResponseDto } from '../dto/medical-specialty-response.dto.js';
import { UpdateCountryRequestDto } from '../dto/update-country-request.dto.js';
import { UpdateInsuranceProviderRequestDto } from '../dto/update-insurance-provider-request.dto.js';
import { UpdateMedicalSpecialtyRequestDto } from '../dto/update-medical-specialty-request.dto.js';
import { mapReferenceError } from '../mappers/reference-exception.mapper.js';

// Onboarding Redesign (2026-07-21 proposal, §5/§6/§14 Stage O.1): SuperAdmin-
// only CRUD over reference/lookup data -- these need to be runtime-
// extensible by non-engineering staff (docs/09-physical-database.md's own
// rationale for why this data belongs in tables, not enums). Read access for
// every other authenticated account lives on the separate, more permissive
// ReferenceDirectoryController (`GET /reference/*`), mirroring the same
// split AdministrationController/HospitalDirectoryController already
// established for hospitals.
@Controller('admin/reference')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.SuperAdmin)
export class AdminReferenceController {
  constructor(
    private readonly listMedicalSpecialtiesUseCase: ListMedicalSpecialtiesUseCase,
    private readonly createMedicalSpecialtyUseCase: CreateMedicalSpecialtyUseCase,
    private readonly updateMedicalSpecialtyUseCase: UpdateMedicalSpecialtyUseCase,
    private readonly listCountriesUseCase: ListCountriesUseCase,
    private readonly createCountryUseCase: CreateCountryUseCase,
    private readonly updateCountryUseCase: UpdateCountryUseCase,
    private readonly listInsuranceProvidersUseCase: ListInsuranceProvidersUseCase,
    private readonly createInsuranceProviderUseCase: CreateInsuranceProviderUseCase,
    private readonly updateInsuranceProviderUseCase: UpdateInsuranceProviderUseCase,
  ) {}

  @Get('specialties')
  async listSpecialties(): Promise<ResponseEnvelope<MedicalSpecialtyResponseDto[]>> {
    const specialties = await this.listMedicalSpecialtiesUseCase.execute();
    return envelope(specialties.map((specialty) => MedicalSpecialtyResponseDto.fromDomain(specialty)));
  }

  @Post('specialties')
  @HttpCode(HttpStatus.CREATED)
  async createSpecialty(
    @Body() body: CreateMedicalSpecialtyRequestDto,
  ): Promise<ResponseEnvelope<MedicalSpecialtyResponseDto>> {
    try {
      const specialty = await this.createMedicalSpecialtyUseCase.execute(
        new CreateMedicalSpecialtyCommand({ name: body.name }),
      );
      return envelope(MedicalSpecialtyResponseDto.fromDomain(specialty));
    } catch (error) {
      throw mapReferenceError(error);
    }
  }

  @Patch('specialties/:id')
  async updateSpecialty(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateMedicalSpecialtyRequestDto,
  ): Promise<ResponseEnvelope<MedicalSpecialtyResponseDto>> {
    try {
      const specialty = await this.updateMedicalSpecialtyUseCase.execute(
        new UpdateMedicalSpecialtyCommand({ medicalSpecialtyId: id, name: body.name, isActive: body.isActive }),
      );
      return envelope(MedicalSpecialtyResponseDto.fromDomain(specialty));
    } catch (error) {
      throw mapReferenceError(error);
    }
  }

  @Get('countries')
  async listCountries(): Promise<ResponseEnvelope<CountryResponseDto[]>> {
    const countries = await this.listCountriesUseCase.execute();
    return envelope(countries.map((country) => CountryResponseDto.fromDomain(country)));
  }

  @Post('countries')
  @HttpCode(HttpStatus.CREATED)
  async createCountry(@Body() body: CreateCountryRequestDto): Promise<ResponseEnvelope<CountryResponseDto>> {
    try {
      const country = await this.createCountryUseCase.execute(
        new CreateCountryCommand({ name: body.name, iso2Code: body.iso2Code }),
      );
      return envelope(CountryResponseDto.fromDomain(country));
    } catch (error) {
      throw mapReferenceError(error);
    }
  }

  @Patch('countries/:id')
  async updateCountry(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateCountryRequestDto,
  ): Promise<ResponseEnvelope<CountryResponseDto>> {
    try {
      const country = await this.updateCountryUseCase.execute(
        new UpdateCountryCommand({ countryId: id, name: body.name, isActive: body.isActive }),
      );
      return envelope(CountryResponseDto.fromDomain(country));
    } catch (error) {
      throw mapReferenceError(error);
    }
  }

  @Get('insurance-providers')
  async listInsuranceProviders(): Promise<ResponseEnvelope<InsuranceProviderResponseDto[]>> {
    const providers = await this.listInsuranceProvidersUseCase.execute();
    return envelope(providers.map((provider) => InsuranceProviderResponseDto.fromDomain(provider)));
  }

  @Post('insurance-providers')
  @HttpCode(HttpStatus.CREATED)
  async createInsuranceProvider(
    @Body() body: CreateInsuranceProviderRequestDto,
  ): Promise<ResponseEnvelope<InsuranceProviderResponseDto>> {
    try {
      const provider = await this.createInsuranceProviderUseCase.execute(
        new CreateInsuranceProviderCommand({ name: body.name }),
      );
      return envelope(InsuranceProviderResponseDto.fromDomain(provider));
    } catch (error) {
      throw mapReferenceError(error);
    }
  }

  @Patch('insurance-providers/:id')
  async updateInsuranceProvider(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateInsuranceProviderRequestDto,
  ): Promise<ResponseEnvelope<InsuranceProviderResponseDto>> {
    try {
      const provider = await this.updateInsuranceProviderUseCase.execute(
        new UpdateInsuranceProviderCommand({ insuranceProviderId: id, name: body.name, isActive: body.isActive }),
      );
      return envelope(InsuranceProviderResponseDto.fromDomain(provider));
    } catch (error) {
      throw mapReferenceError(error);
    }
  }
}
