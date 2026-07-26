import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { AvailabilityWindow } from '../../../../doctor/domain/entities/availability-window.entity.js';
import { AvailabilityWindowStatus } from '../../../../doctor/domain/enums/availability-window-status.enum.js';
import { ConsultationType } from '../../../../doctor/domain/enums/consultation-type.enum.js';
import { DoctorDomainError } from '../../../../doctor/domain/exceptions/doctor-domain.error.js';
import { DefineAvailabilityWindowCommand } from '../../../../doctor/application/use-cases/define-availability-window/define-availability-window.command.js';
import type { DefineAvailabilityWindowUseCase } from '../../../../doctor/application/use-cases/define-availability-window/define-availability-window.use-case.js';
import type { GetDoctorProfileByIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { ListAvailabilityWindowsForDoctorQuery } from '../../../../doctor/application/use-cases/list-availability-windows-for-doctor/list-availability-windows-for-doctor.query.js';
import type { ListAvailabilityWindowsForDoctorUseCase } from '../../../../doctor/application/use-cases/list-availability-windows-for-doctor/list-availability-windows-for-doctor.use-case.js';
import { generateCandidateSlotsForDate, resolveEffectiveDay } from '../../services/generate-bookable-slots.js';
import type { GetDoctorWorkingHoursUseCase } from '../get-doctor-working-hours/get-doctor-working-hours.use-case.js';
import { GetDoctorWorkingHoursQuery } from '../get-doctor-working-hours/get-doctor-working-hours.query.js';
import type { GetSchedulingRulesUseCase } from '../get-scheduling-rules/get-scheduling-rules.use-case.js';
import type { ListHolidaysUseCase } from '../list-holidays/list-holidays.use-case.js';
import type { ListScheduleExceptionsForDoctorUseCase } from '../list-schedule-exceptions-for-doctor/list-schedule-exceptions-for-doctor.use-case.js';
import { ListScheduleExceptionsForDoctorQuery } from '../list-schedule-exceptions-for-doctor/list-schedule-exceptions-for-doctor.query.js';

import type { GetBookableAvailabilityQuery } from './get-bookable-availability.query.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Onboarding Redesign integration-gap closure (2026-07-25): SchedulingModule's
 * "what can a patient actually book with this doctor" read -- the single
 * place `AvailabilityWindow` rows get lazily materialized from the doctor's
 * own recurring working hours + exceptions + holidays + the existing global
 * `SchedulingRules`. Reuses `DefineAvailabilityWindowUseCase` verbatim for
 * creation (no new domain logic, no weakened overlap/concurrency guarantees)
 * and only ever returns windows that are genuinely bookable right now
 * (`Open`, or `Held` with a lapsed hold) -- a `Booked` or actively-`Held`
 * slot simply doesn't appear, exactly like "available" should read.
 *
 * `consultationType` is not a per-slot choice: this codebase's `ConsultationType`
 * is `Free | Paid`, not a modality, and nothing configures it per-slot today
 * -- it's derived once per doctor from `DoctorProfile.consultationFeeAmount`
 * (set -> Paid, unset -> Free), matching the only real signal that exists.
 */
export class GetBookableAvailabilityUseCase {
  constructor(
    private readonly getDoctorWorkingHoursUseCase: GetDoctorWorkingHoursUseCase,
    private readonly listScheduleExceptionsForDoctorUseCase: ListScheduleExceptionsForDoctorUseCase,
    private readonly listHolidaysUseCase: ListHolidaysUseCase,
    private readonly getSchedulingRulesUseCase: GetSchedulingRulesUseCase,
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
    private readonly listAvailabilityWindowsForDoctorUseCase: ListAvailabilityWindowsForDoctorUseCase,
    private readonly defineAvailabilityWindowUseCase: DefineAvailabilityWindowUseCase,
  ) {}

  async execute(query: GetBookableAvailabilityQuery): Promise<AvailabilityWindow[]> {
    const doctorProfile = await this.getDoctorProfileByIdUseCase.execute({ doctorProfileId: query.doctorId });
    if (!doctorProfile) {
      throw new NotFoundError(`Doctor profile "${query.doctorId}" not found.`);
    }
    const consultationType =
      doctorProfile.getConsultationFeeAmount() !== undefined ? ConsultationType.Paid : ConsultationType.Free;

    const [workingDays, exceptions, holidays, rules, existingWindows] = await Promise.all([
      this.getDoctorWorkingHoursUseCase.execute(new GetDoctorWorkingHoursQuery({ doctorId: query.doctorId })),
      this.listScheduleExceptionsForDoctorUseCase.execute(
        new ListScheduleExceptionsForDoctorQuery({ doctorId: query.doctorId }),
      ),
      this.listHolidaysUseCase.execute(),
      this.getSchedulingRulesUseCase.execute(),
      this.listAvailabilityWindowsForDoctorUseCase.execute(
        new ListAvailabilityWindowsForDoctorQuery({ doctorId: query.doctorId, from: query.from, to: query.to }),
      ),
    ]);

    const existingByStart = new Map(existingWindows.map((window) => [window.getStartTime().getTime(), window]));
    const now = new Date();
    const available: AvailabilityWindow[] = [];

    for (
      let cursor = new Date(Date.UTC(query.from.getUTCFullYear(), query.from.getUTCMonth(), query.from.getUTCDate()));
      cursor.getTime() < query.to.getTime();
      cursor = new Date(cursor.getTime() + MS_PER_DAY)
    ) {
      const effectiveDay = resolveEffectiveDay(cursor, workingDays, exceptions, holidays);
      const candidates = generateCandidateSlotsForDate(cursor, effectiveDay, rules, now);

      for (const candidate of candidates) {
        const existing = existingByStart.get(candidate.start.getTime());
        if (existing) {
          if (this.isBookable(existing, now)) {
            available.push(existing);
          }
          continue;
        }

        try {
          const created = await this.defineAvailabilityWindowUseCase.execute(
            new DefineAvailabilityWindowCommand({
              doctorId: query.doctorId,
              startTime: candidate.start,
              endTime: candidate.end,
              consultationType,
            }),
          );
          available.push(created);
        } catch (error) {
          // Another concurrent request materialized (or reserved) this exact
          // slot between our read above and this create -- not a failure of
          // this request, just something that's no longer freely available.
          if (!(error instanceof DoctorDomainError)) {
            throw error;
          }
        }
      }
    }

    return available;
  }

  private isBookable(window: AvailabilityWindow, now: Date): boolean {
    if (window.getStatus() === AvailabilityWindowStatus.Open) return true;
    return window.getStatus() === AvailabilityWindowStatus.Held && window.isHoldExpired(now);
  }
}
