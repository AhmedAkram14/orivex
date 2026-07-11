import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { NotFoundError } from '../../../../shared/errors/app-error.js';
import { GetPrescriptionByIdUseCase } from '../../application/use-cases/get-prescription-by-id/get-prescription-by-id.use-case.js';
import { SignPrescriptionCommand } from '../../application/use-cases/sign-prescription/sign-prescription.command.js';
import { SignPrescriptionUseCase } from '../../application/use-cases/sign-prescription/sign-prescription.use-case.js';
import { PrescriptionResponseDto } from '../dto/prescription-response.dto.js';
import { SignPrescriptionRequestDto } from '../dto/sign-prescription-request.dto.js';
import { mapClinicalError } from '../mappers/clinical-exception.mapper.js';

// Matches docs/12-openapi.md's POST /prescriptions (signPrescription) and
// GET /prescriptions/{id} (getPrescription) exactly.
@Controller('prescriptions')
export class PrescriptionController {
  constructor(
    private readonly signPrescriptionUseCase: SignPrescriptionUseCase,
    private readonly getPrescriptionByIdUseCase: GetPrescriptionByIdUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async sign(@Body() body: SignPrescriptionRequestDto): Promise<ResponseEnvelope<PrescriptionResponseDto>> {
    try {
      const prescription = await this.signPrescriptionUseCase.execute(
        new SignPrescriptionCommand({
          consultationSessionId: body.consultationSessionId,
          diagnosisNodeId: body.diagnosisNodeId,
          authoringDoctorId: body.authoringDoctorId,
          lineItems: body.lineItems,
        }),
      );
      return envelope(PrescriptionResponseDto.fromDomain(prescription));
    } catch (error) {
      throw mapClinicalError(error);
    }
  }

  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseEnvelope<PrescriptionResponseDto>> {
    try {
      const prescription = await this.getPrescriptionByIdUseCase.execute({ prescriptionId: id });
      if (!prescription) {
        throw new NotFoundError(`Prescription "${id}" not found.`);
      }
      return envelope(PrescriptionResponseDto.fromDomain(prescription));
    } catch (error) {
      throw mapClinicalError(error);
    }
  }
}
