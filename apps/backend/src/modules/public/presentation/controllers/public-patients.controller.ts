import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';

import { NotFoundError } from '../../../../shared/errors/app-error.js';
import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { PublicPatientResponseDto } from '../dto/public-patient-response.dto.js';

// Genuinely public, no guard -- the one deliberate exception to
// PatientProfileController's "never another patient's id" rule (see that
// controller's own header comment), added specifically so a public review
// on a doctor's profile can name and link to the patient who wrote it.
// PublicPatientResponseDto is the enforcement point: it carries only what's
// safe to show a stranger, nothing PatientProfileController itself exposes.
//
// EXPLORE -> UNDERSTAND -> BUILD TRUST -> TAKE ACTION -> AUTHENTICATE
// architecture decision: this controller stays deliberately minimal forever
// -- clinical data (profile/appointments/medical-records/prescriptions/
// documents) is never added here, no matter how public the rest of the
// product becomes. That data lives behind DoctorPatientChartController
// (ClinicalModule), gated by real sign-in + a real doctor-patient
// relationship check, not by this controller loosening its own guard.
@Controller('public/patients')
export class PublicPatientsController {
  constructor(
    private readonly getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
  ) {}

  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseEnvelope<PublicPatientResponseDto>> {
    const profile = await this.getPatientProfileByIdUseCase.execute({ patientProfileId: id });
    if (!profile) {
      throw new NotFoundError(`Patient profile "${id}" not found.`);
    }
    const account = await this.getAccountByIdUseCase.execute({ accountId: profile.getAccountId() });
    if (!account) {
      throw new NotFoundError(`Account for patient profile "${id}" not found.`);
    }
    return envelope(PublicPatientResponseDto.fromDomain(profile, account));
  }
}
