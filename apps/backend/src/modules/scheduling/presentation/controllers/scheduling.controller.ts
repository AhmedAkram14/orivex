import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseArrayPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { NotFoundError } from '../../../../shared/errors/app-error.js';
import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { ListAvailabilityWindowsForDoctorQuery } from '../../../doctor/application/use-cases/list-availability-windows-for-doctor/list-availability-windows-for-doctor.query.js';
import { ListAvailabilityWindowsForDoctorUseCase } from '../../../doctor/application/use-cases/list-availability-windows-for-doctor/list-availability-windows-for-doctor.use-case.js';
import { UpdateAvailabilityWindowPricingCommand } from '../../../doctor/application/use-cases/update-availability-window-pricing/update-availability-window-pricing.command.js';
import { UpdateAvailabilityWindowPricingUseCase } from '../../../doctor/application/use-cases/update-availability-window-pricing/update-availability-window-pricing.use-case.js';
import { AvailabilityWindowStatus } from '../../../doctor/domain/enums/availability-window-status.enum.js';
import { ConsultationPricing as DoctorConsultationPricing } from '../../../doctor/domain/value-objects/consultation-pricing.value-object.js';
import { Money as DoctorMoney } from '../../../doctor/domain/value-objects/money.value-object.js';
import type { WeekDay } from '../../domain/enums/week-day.enum.js';
import { ConsultationPricing } from '../../domain/value-objects/consultation-pricing.value-object.js';
import { Money } from '../../domain/value-objects/money.value-object.js';
import type { ScheduleExceptionType } from '../../domain/enums/schedule-exception-type.enum.js';
import { AddScheduleExceptionCommand } from '../../application/use-cases/add-schedule-exception/add-schedule-exception.command.js';
import { AddScheduleExceptionUseCase } from '../../application/use-cases/add-schedule-exception/add-schedule-exception.use-case.js';
import { GetDoctorWorkingHoursQuery } from '../../application/use-cases/get-doctor-working-hours/get-doctor-working-hours.query.js';
import { GetDoctorWorkingHoursUseCase } from '../../application/use-cases/get-doctor-working-hours/get-doctor-working-hours.use-case.js';
import { GetSchedulingRulesUseCase } from '../../application/use-cases/get-scheduling-rules/get-scheduling-rules.use-case.js';
import { ListHolidaysUseCase } from '../../application/use-cases/list-holidays/list-holidays.use-case.js';
import { ListScheduleExceptionsForDoctorQuery } from '../../application/use-cases/list-schedule-exceptions-for-doctor/list-schedule-exceptions-for-doctor.query.js';
import { ListScheduleExceptionsForDoctorUseCase } from '../../application/use-cases/list-schedule-exceptions-for-doctor/list-schedule-exceptions-for-doctor.use-case.js';
import { RemoveScheduleExceptionCommand } from '../../application/use-cases/remove-schedule-exception/remove-schedule-exception.command.js';
import { RemoveScheduleExceptionUseCase } from '../../application/use-cases/remove-schedule-exception/remove-schedule-exception.use-case.js';
import { UpdateDoctorWorkingHoursCommand } from '../../application/use-cases/update-doctor-working-hours/update-doctor-working-hours.command.js';
import { UpdateDoctorWorkingHoursUseCase } from '../../application/use-cases/update-doctor-working-hours/update-doctor-working-hours.use-case.js';
import { AvailabilityWindowResponseDto } from '../dto/availability-window-response.dto.js';
import { AddScheduleExceptionRequestDto } from '../dto/add-schedule-exception-request.dto.js';
import { HolidayResponseDto } from '../dto/holiday-response.dto.js';
import { ScheduleExceptionResponseDto } from '../dto/schedule-exception-response.dto.js';
import { SchedulingRulesResponseDto } from '../dto/scheduling-rules-response.dto.js';
import { UpdateAvailabilityWindowPricingRequestDto } from '../dto/update-availability-window-pricing-request.dto.js';
import { WorkingHoursDayRequestDto } from '../dto/update-doctor-working-hours-request.dto.js';
import { WorkingHoursDayResponseDto } from '../dto/working-hours-day-response.dto.js';
import { mapDoctorError } from '../../../doctor/presentation/mappers/doctor-exception.mapper.js';
import { mapSchedulingError } from '../mappers/scheduling-exception.mapper.js';

// The doctor's own schedule management surface -- mirrors DoctorProfile
// Controller's/PatientProfileController's "/me"-style own-resource pattern:
// no doctor id in the path, scoped implicitly to "the current authenticated
// doctor" via the JWT. GET /holidays and GET /rules are the two exceptions:
// global, doctor-agnostic, read-only data any authenticated account (patient
// or doctor) may read, so they carry no @Roles() restriction.
//
// Matches the frontend's real SCHEDULING_PATHS exactly (features/scheduling/
// api/paths.ts): doctor-availability, doctor-exceptions, holidays, rules.
// bookings/waitlist are deliberately out of scope here -- the patient-facing
// booking flow stays MSW-only until a real doctor-directory feature exists.
@Controller('scheduling')
export class SchedulingController {
  constructor(
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
    private readonly getDoctorWorkingHoursUseCase: GetDoctorWorkingHoursUseCase,
    private readonly updateDoctorWorkingHoursUseCase: UpdateDoctorWorkingHoursUseCase,
    private readonly listScheduleExceptionsForDoctorUseCase: ListScheduleExceptionsForDoctorUseCase,
    private readonly addScheduleExceptionUseCase: AddScheduleExceptionUseCase,
    private readonly removeScheduleExceptionUseCase: RemoveScheduleExceptionUseCase,
    private readonly listHolidaysUseCase: ListHolidaysUseCase,
    private readonly getSchedulingRulesUseCase: GetSchedulingRulesUseCase,
    private readonly listAvailabilityWindowsForDoctorUseCase: ListAvailabilityWindowsForDoctorUseCase,
    private readonly updateAvailabilityWindowPricingUseCase: UpdateAvailabilityWindowPricingUseCase,
  ) {}

  @Get('doctor-availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.Doctor)
  async getDoctorAvailability(
    @CurrentUser() user: AccessTokenClaims,
  ): Promise<ResponseEnvelope<WorkingHoursDayResponseDto[]>> {
    try {
      const doctorId = await this.doctorIdOrThrow(user.accountId);
      const days = await this.getDoctorWorkingHoursUseCase.execute(new GetDoctorWorkingHoursQuery({ doctorId }));
      return envelope(days.map((day) => WorkingHoursDayResponseDto.fromDomain(day)));
    } catch (error) {
      throw mapSchedulingError(error);
    }
  }

  @Patch('doctor-availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.Doctor)
  async updateDoctorAvailability(
    @CurrentUser() user: AccessTokenClaims,
    @Body(new ParseArrayPipe({ items: WorkingHoursDayRequestDto }))
    body: WorkingHoursDayRequestDto[],
  ): Promise<ResponseEnvelope<WorkingHoursDayResponseDto[]>> {
    try {
      const doctorId = await this.doctorIdOrThrow(user.accountId);
      const days = await this.updateDoctorWorkingHoursUseCase.execute(
        new UpdateDoctorWorkingHoursCommand({
          doctorId,
          days: body.map((day) => ({
            dayOfWeek: day.dayOfWeek as WeekDay,
            isWorkingDay: day.isWorkingDay,
            hours: day.hours,
            breaks: day.breaks,
            pricing: day.pricing ? this.toPricing(day.pricing) : undefined,
          })),
        }),
      );
      return envelope(days.map((day) => WorkingHoursDayResponseDto.fromDomain(day)));
    } catch (error) {
      throw mapSchedulingError(error);
    }
  }

  @Get('doctor-exceptions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.Doctor)
  async getDoctorExceptions(
    @CurrentUser() user: AccessTokenClaims,
  ): Promise<ResponseEnvelope<ScheduleExceptionResponseDto[]>> {
    try {
      const doctorId = await this.doctorIdOrThrow(user.accountId);
      const exceptions = await this.listScheduleExceptionsForDoctorUseCase.execute(
        new ListScheduleExceptionsForDoctorQuery({ doctorId }),
      );
      return envelope(exceptions.map((exception) => ScheduleExceptionResponseDto.fromDomain(exception)));
    } catch (error) {
      throw mapSchedulingError(error);
    }
  }

  @Post('doctor-exceptions')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.Doctor)
  async addDoctorException(
    @CurrentUser() user: AccessTokenClaims,
    @Body() body: AddScheduleExceptionRequestDto,
  ): Promise<ResponseEnvelope<ScheduleExceptionResponseDto>> {
    try {
      const doctorId = await this.doctorIdOrThrow(user.accountId);
      const exception = await this.addScheduleExceptionUseCase.execute(
        new AddScheduleExceptionCommand({
          doctorId,
          date: body.date,
          type: body.type as ScheduleExceptionType,
          hours: body.hours,
          reason: body.reason,
        }),
      );
      return envelope(ScheduleExceptionResponseDto.fromDomain(exception));
    } catch (error) {
      throw mapSchedulingError(error);
    }
  }

  @Delete('doctor-exceptions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.Doctor)
  async removeDoctorException(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    try {
      const doctorId = await this.doctorIdOrThrow(user.accountId);
      const removed = await this.removeScheduleExceptionUseCase.execute(
        new RemoveScheduleExceptionCommand({ exceptionId: id, doctorId }),
      );
      if (!removed) {
        throw new NotFoundError(`Schedule exception "${id}" not found.`);
      }
    } catch (error) {
      throw mapSchedulingError(error);
    }
  }

  // Consultation Pricing Redesign: every generated, not-yet-booked window
  // for the doctor -- the "Upcoming Slots" management list, so a doctor can
  // override an individual slot's pricing without touching the template.
  // A generous fixed 60-day window (this endpoint's own concern, not tied
  // to SchedulingRules' maxBookingWindowDays) -- wide enough to cover any
  // slot a patient could currently book.
  @Get('upcoming-slots')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.Doctor)
  async getUpcomingSlots(
    @CurrentUser() user: AccessTokenClaims,
  ): Promise<ResponseEnvelope<AvailabilityWindowResponseDto[]>> {
    try {
      const doctorId = await this.doctorIdOrThrow(user.accountId);
      const from = new Date();
      const to = new Date(from.getTime() + 60 * 24 * 60 * 60_000);
      const windows = await this.listAvailabilityWindowsForDoctorUseCase.execute(
        new ListAvailabilityWindowsForDoctorQuery({ doctorId, from, to }),
      );
      const openWindows = windows.filter((window) => window.getStatus() === AvailabilityWindowStatus.Open);
      return envelope(openWindows.map((window) => AvailabilityWindowResponseDto.fromDomain(window)));
    } catch (error) {
      throw mapSchedulingError(error);
    }
  }

  @Patch('upcoming-slots/:id/pricing')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.Doctor)
  async updateSlotPricing(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateAvailabilityWindowPricingRequestDto,
  ): Promise<ResponseEnvelope<AvailabilityWindowResponseDto>> {
    try {
      const doctorId = await this.doctorIdOrThrow(user.accountId);
      const window = await this.updateAvailabilityWindowPricingUseCase.execute(
        new UpdateAvailabilityWindowPricingCommand({
          availabilityWindowId: id,
          requestingDoctorId: doctorId,
          pricing: this.toDoctorPricing(body),
        }),
      );
      return envelope(AvailabilityWindowResponseDto.fromDomain(window));
    } catch (error) {
      throw mapDoctorError(error);
    }
  }

  // Two near-identical conversions, one per module's own ConsultationPricing
  // (domain layers never import across module boundaries -- this
  // presentation-layer controller is the translation point between the
  // request DTO and whichever module's use case is being called).
  private toPricing(input: { pricingType: 'free' | 'paid'; feeAmount?: number; feeCurrency?: string }): ConsultationPricing {
    if (input.pricingType === 'free') {
      return ConsultationPricing.free();
    }
    return ConsultationPricing.paid(Money.create(input.feeAmount ?? 0, input.feeCurrency ?? 'EGP'));
  }

  private toDoctorPricing(input: { pricingType: 'free' | 'paid'; feeAmount?: number; feeCurrency?: string }): DoctorConsultationPricing {
    if (input.pricingType === 'free') {
      return DoctorConsultationPricing.free();
    }
    return DoctorConsultationPricing.paid(DoctorMoney.create(input.feeAmount ?? 0, input.feeCurrency ?? 'EGP'));
  }

  @Get('holidays')
  @UseGuards(JwtAuthGuard)
  async getHolidays(): Promise<ResponseEnvelope<HolidayResponseDto[]>> {
    const holidays = await this.listHolidaysUseCase.execute();
    return envelope(holidays.map((holiday) => HolidayResponseDto.fromDomain(holiday)));
  }

  @Get('rules')
  @UseGuards(JwtAuthGuard)
  async getRules(): Promise<ResponseEnvelope<SchedulingRulesResponseDto>> {
    const rules = await this.getSchedulingRulesUseCase.execute();
    return envelope(SchedulingRulesResponseDto.fromDomain(rules));
  }

  private async doctorIdOrThrow(accountId: string): Promise<string> {
    const profile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId });
    if (!profile) {
      throw new NotFoundError(`Doctor profile for account "${accountId}" not found.`);
    }
    return profile.getId();
  }
}
